// recruitment-backend/services/candidateService.js - ENHANCED VERSION
const db = require('../data/database');
const caseService = require('./caseService');
const candidateSearchSync = require('./candidateSearchSync');

class CandidateService {
  /**
   * Create candidate with complete validation
   */
  async createCandidate(candidateData, createdBy) {
    try {
      // Step 1: Validate completeness
      const validation = await this.validateCandidateData(candidateData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Step 2: Check for duplicates
      const existing = await this.checkDuplicate(candidateData.email, candidateData.phone);
      if (existing) {
        throw new Error(`Candidate already exists with ID: ${existing.id}`);
      }
      
      // Step 3: Calculate derived fields
      const enrichedData = await this.enrichCandidateData(candidateData);
      
      // Step 4: Create candidate in transaction
      const result = await db.transaction(async (client) => {
        // Update primary_data if exists
        if (candidateData.primaryDataId) {
          await this.updatePrimaryDataComplete(client, candidateData.primaryDataId, enrichedData);
        }
        
        // Create candidate record
        const candidateQuery = `
          INSERT INTO candidate (
            name, email, phone, linkedin_url, current_location,
            visa_status, years_experience, skills, education,
            current_employer, status, source, source_id,
            referred_by, availability, expected_salary, notes,
            resume_url, resume_text, quality_score,
            pdata_id, sdata_id, candidate_rating,
            is_indexed, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                   $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                   $21, $22, $23, $24, $25, NOW())
          RETURNING id
        `;
        
        const candidateResult = await client.query(candidateQuery, [
          enrichedData.name,
          enrichedData.email,
          enrichedData.phone,
          enrichedData.linkedin_url,
          enrichedData.current_location,
          enrichedData.visa_status,
          enrichedData.years_experience,
          enrichedData.skills,
          enrichedData.education,
          enrichedData.current_employer,
          enrichedData.status || 'Active',
          enrichedData.source || 'Manual',
          enrichedData.source_id,
          enrichedData.referred_by,
          enrichedData.availability,
          enrichedData.expected_salary,
          enrichedData.notes,
          enrichedData.resume_url,
          enrichedData.resume_text,
          enrichedData.quality_score,
          candidateData.primaryDataId,
          candidateData.secondaryDataId,
          enrichedData.candidate_rating,
          false, // Will be indexed after creation
          createdBy
        ]);
        
        const candidateId = candidateResult.rows[0].id;
        
        // Log activity
        await client.query(
          `INSERT INTO candidate_activities (
            candidate_id, activity_type, description, performed_by, performed_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [candidateId, 'created', 'Candidate profile created', createdBy]
        );
        
        return { candidateId };
      });
      
      // Step 5: Sync to Azure Search
      const candidate = await this.getCandidateById(result.candidateId);
      await candidateSearchSync.onCandidateCreated(candidate);
      
      // Step 6: Update case if linked
      if (candidateData.caseId) {
        await caseService.triggerStatusTransition(
          candidateData.caseId,
          'candidate_created',
          { candidateId: result.candidateId }
        );
      }
      
      // Step 7: Notify referrer if applicable
      if (enrichedData.referred_by) {
        this.notifyReferrer(enrichedData.referred_by, candidate).catch(console.error);
      }
      
      console.log(`✅ Candidate ${enrichedData.name} created with ID: ${result.candidateId}`);
      
      return {
        candidateId: result.candidateId,
        candidate,
        isGoldCandidate: enrichedData.is_gold_candidate,
        qualityScore: enrichedData.quality_score
      };
      
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  /**
   * Create candidate from email/case
   */
  async createCandidateFromCase(caseId, additionalData = {}) {
    try {
      // Get case data
      const caseData = await caseService.getCaseById(caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }
      
      // Get primary and secondary data
      const primaryData = await this.getPrimaryData(caseData.pdata_id);
      const secondaryData = await this.getSecondaryData(caseData.pdata_id);
      
      // Merge all data sources
      const candidateData = {
        ...this.mapPrimaryToCandidate(primaryData),
        ...this.mapSecondaryToCandidate(secondaryData),
        ...additionalData,
        primaryDataId: caseData.pdata_id,
        secondaryDataId: secondaryData?.id,
        caseId: caseId,
        source: 'Email Referral'
      };
      
      // Create candidate with validation
      return await this.createCandidate(candidateData, 'system');
      
    } catch (error) {
      console.error('Error creating candidate from case:', error);
      throw error;
    }
  }

  /**
   * Validate candidate data completeness
   */
  async validateCandidateData(data) {
    const errors = [];
    const warnings = [];
    
    // Required fields - MUST have
    const requiredFields = {
      name: 'Candidate name',
      email: 'Email address',
      phone: 'Phone number',
      visa_status: 'Visa status',
      years_experience: 'Years of experience',
      skills: 'Skills (at least one)',
      current_location: 'Current location'
    };
    
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!data[field]) {
        errors.push(`${label} is required`);
      }
    }
    
    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
    
    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone format');
    }
    
    // Skills validation
    if (data.skills && (!Array.isArray(data.skills) || data.skills.length === 0)) {
      errors.push('At least one skill is required');
    }
    
    // Years experience validation
    if (data.years_experience !== undefined && data.years_experience < 0) {
      errors.push('Years of experience cannot be negative');
    }
    
    // Quality checks (warnings, not blockers)
    if (!data.linkedin_url) {
      warnings.push('LinkedIn profile missing');
    }
    
    if (!data.resume_url && !data.resume_text) {
      warnings.push('Resume not attached');
    }
    
    if (!data.education) {
      warnings.push('Education information missing');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness: this.calculateCompleteness(data)
    };
  }

  /**
   * Check for duplicate candidates
   */
  async checkDuplicate(email, phone) {
    // Check by email
    if (email) {
      const emailCheck = await db.query(
        'SELECT id, name FROM candidate WHERE email = $1',
        [email]
      );
      if (emailCheck.rows.length > 0) {
        return emailCheck.rows[0];
      }
    }
    
    // Check by phone (if email not found)
    if (phone) {
      const phoneCheck = await db.query(
        'SELECT id, name FROM candidate WHERE phone = $1',
        [phone]
      );
      if (phoneCheck.rows.length > 0) {
        return phoneCheck.rows[0];
      }
    }
    
    return null;
  }

  /**
   * Enrich candidate data with calculated fields
   */
  async enrichCandidateData(data) {
    const enriched = { ...data };
    
    // Calculate quality score
    enriched.quality_score = this.calculateQualityScore(data);
    
    // Determine if gold candidate (10+ years & GC/Citizen)
    enriched.is_gold_candidate = 
      (data.years_experience >= 10) && 
      ['Citizen', 'Green Card', 'GC', 'USC'].includes(data.visa_status);
    
    // Auto-calculate rating based on quality
    if (!enriched.candidate_rating) {
      if (enriched.quality_score >= 90) enriched.candidate_rating = 5;
      else if (enriched.quality_score >= 75) enriched.candidate_rating = 4;
      else if (enriched.quality_score >= 60) enriched.candidate_rating = 3;
      else if (enriched.quality_score >= 40) enriched.candidate_rating = 2;
      else enriched.candidate_rating = 1;
    }
    
    // Parse and clean skills
    if (typeof enriched.skills === 'string') {
      enriched.skills = enriched.skills.split(',').map(s => s.trim());
    }
    
    // Normalize visa status
    enriched.visa_status = this.normalizeVisaStatus(enriched.visa_status);
    
    // Set availability
    if (!enriched.availability) {
      enriched.availability = 'Immediate';
    }
    
    return enriched;
  }

  /**
   * Calculate quality score
   */
  calculateQualityScore(data) {
    let score = 0;
    const weights = {
      name: 5,
      email: 5,
      phone: 5,
      linkedin_url: 10,
      current_location: 5,
      visa_status: 10,
      years_experience: 10,
      skills: 15,
      education: 10,
      current_employer: 5,
      resume_url: 10,
      resume_text: 5,
      expected_salary: 5
    };
    
    for (const [field, weight] of Object.entries(weights)) {
      if (data[field]) {
        if (field === 'skills' && Array.isArray(data[field])) {
          // More skills = higher score
          score += Math.min(weight, (data[field].length / 5) * weight);
        } else if (field === 'years_experience') {
          // More experience = higher score
          score += Math.min(weight, (data[field] / 10) * weight);
        } else {
          score += weight;
        }
      }
    }
    
    return Math.round(score);
  }

  /**
   * Calculate profile completeness
   */
  calculateCompleteness(data) {
    const fields = [
      'name', 'email', 'phone', 'linkedin_url',
      'current_location', 'visa_status', 'years_experience',
      'skills', 'education', 'current_employer',
      'resume_url', 'expected_salary', 'availability'
    ];
    
    const filled = fields.filter(field => data[field] && data[field] !== '').length;
    return Math.round((filled / fields.length) * 100);
  }

  /**
   * Update candidate with verification data
   */
  async updateCandidateWithVerification(candidateId, verificationData, updatedBy) {
    try {
      const updates = [];
      const params = [];
      let paramCount = 0;
      
      // Map verification data to candidate fields
      const checklist = verificationData.checklistItems;
      
      if (checklist.currentLocation?.value) {
        updates.push(`current_location = $${++paramCount}`);
        params.push(checklist.currentLocation.value);
      }
      
      if (checklist.visaStatus?.value) {
        updates.push(`visa_status = $${++paramCount}`);
        params.push(checklist.visaStatus.value);
      }
      
      // Add verification notes
      if (verificationData.notes?.generalNotes) {
        updates.push(`notes = COALESCE(notes, '') || $${++paramCount}`);
        params.push(`\n[Verification]: ${verificationData.notes.generalNotes}`);
      }
      
      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        updates.push(`last_updated_by = $${++paramCount}`);
        params.push(updatedBy);
        params.push(candidateId);
        
        const query = `
          UPDATE candidate 
          SET ${updates.join(', ')}
          WHERE id = $${++paramCount}
        `;
        
        await db.query(query, params);
        
        // Log activity
        await this.logActivity(candidateId, 'verification_update', 
          'Updated with verification data', updatedBy);
        
        // Sync to Azure Search
        const candidate = await this.getCandidateById(candidateId);
        await candidateSearchSync.onCandidateUpdated(candidate);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating with verification:', error);
      throw error;
    }
  }

  /**
   * Get candidate statistics
   */
  async getCandidateStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'Placed' THEN 1 ELSE 0 END) as placed,
        SUM(CASE WHEN quality_score >= 75 THEN 1 ELSE 0 END) as high_quality,
        SUM(CASE WHEN years_experience >= 10 AND visa_status IN ('Citizen', 'Green Card') 
            THEN 1 ELSE 0 END) as gold_candidates,
        AVG(quality_score)::INTEGER as avg_quality_score,
        AVG(years_experience)::INTEGER as avg_experience
      FROM candidate
    `;
    
    const result = await db.query(query);
    return result.rows[0];
  }

  /**
   * Helper methods
   */
  normalizeVisaStatus(status) {
    if (!status) return 'Unknown';
    
    const normalized = {
      'citizen': 'Citizen',
      'usc': 'Citizen',
      'us citizen': 'Citizen',
      'gc': 'Green Card',
      'green card': 'Green Card',
      'permanent resident': 'Green Card',
      'h1b': 'H1B',
      'h1-b': 'H1B',
      'opt': 'OPT',
      'cpt': 'CPT',
      'tn': 'TN',
      'l1': 'L1',
      'h4': 'H4 EAD',
      'h4 ead': 'H4 EAD'
    };
    
    return normalized[status.toLowerCase()] || status;
  }
  
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  isValidPhone(phone) {
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
  
  async getPrimaryData(pdataId) {
    const result = await db.query(
      'SELECT * FROM primary_data WHERE id = $1',
      [pdataId]
    );
    return result.rows[0];
  }
  
  async getSecondaryData(pdataId) {
    const result = await db.query(
      'SELECT * FROM secondary_data WHERE primary_data_id = $1',
      [pdataId]
    );
    return result.rows[0];
  }
  
  mapPrimaryToCandidate(primaryData) {
    if (!primaryData) return {};
    
    return {
      name: primaryData.name,
      email: primaryData.email,
      phone: primaryData.phone_number,
      linkedin_url: primaryData.linkedin_id,
      years_experience: primaryData.years_of_experience,
      skills: primaryData.skills,
      current_employer: primaryData.current_employer_name,
      referred_by: primaryData.referrer_id
    };
  }
  
  mapSecondaryToCandidate(secondaryData) {
    if (!secondaryData) return {};
    
    return {
      notes: secondaryData.verification_notes
    };
  }
  
  async updatePrimaryDataComplete(client, pdataId, candidateData) {
    const query = `
      UPDATE primary_data
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone_number = COALESCE($3, phone_number),
        skills = COALESCE($4, skills),
        years_of_experience = COALESCE($5, years_of_experience),
        updated_at = NOW()
      WHERE id = $6
    `;
    
    await client.query(query, [
      candidateData.name,
      candidateData.email,
      candidateData.phone,
      candidateData.skills,
      candidateData.years_experience,
      pdataId
    ]);
  }
  
  async logActivity(candidateId, type, description, performedBy) {
    await db.query(
      `INSERT INTO candidate_activities 
       (candidate_id, activity_type, description, performed_by, performed_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [candidateId, type, description, performedBy]
    );
  }
  
  async notifyReferrer(referrerId, candidate) {
    // Send notification to referrer about candidate creation
    console.log(`📧 Notifying referrer ${referrerId} about candidate ${candidate.name}`);
  }
  
  // Existing methods remain...
  async getCandidateById(candidateId) {
    const query = `
      SELECT c.*, 
             pd.*, 
             sd.*,
             sm.status_name
      FROM candidate c
      LEFT JOIN primary_data pd ON c.pdata_id = pd.id
      LEFT JOIN secondary_data sd ON c.sdata_id = sd.id
      LEFT JOIN status_master sm ON sm.status_name = c.status
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [candidateId]);
    return result.rows[0];
  }
  
  async getCandidates(filters = {}) {
    let query = `
      SELECT c.*, pd.referrer_id
      FROM candidate c
      LEFT JOIN primary_data pd ON c.pdata_id = pd.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.status) {
      query += ` AND c.status = $${++paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.search) {
      query += ` AND (c.name ILIKE $${++paramCount} OR c.email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      params.push(filters.limit);
    }
    
    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = new CandidateService();
// recruitment-backend/services/verificationService.js
const db = require('../data/database');
const caseService = require('./caseService');

class VerificationService {
  /**
   * Start verification call session
   */
  async startVerification(caseId, userId) {
    try {
      // Update case status to 'In Verification'
      await caseService.triggerStatusTransition(caseId, 'verification_started');
      
      // Create verification session
      const sessionId = await this.createSession(caseId, userId);
      
      // Get case details for verification
      const caseData = await caseService.getCaseById(caseId);
      
      return {
        sessionId,
        caseData,
        checklist: this.getVerificationChecklist(),
        startTime: new Date()
      };
      
    } catch (error) {
      console.error('Start verification error:', error);
      throw error;
    }
  }

  /**
   * Save verification data
   */
  async saveVerificationData(sessionId, verificationData) {
    try {
      // Validate verification data
      const validationResult = this.validateVerificationData(verificationData);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          score: validationResult.score
        };
      }
      
      // Get session details
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Invalid session');
      
      // Update primary_data with verification details
      await this.updatePrimaryData(session.case_id, verificationData);
      
      // Update secondary_data with verification metadata
      await this.updateSecondaryData(session.case_id, verificationData, session.user_id);
      
      // Store detailed verification log
      await this.storeVerificationLog(sessionId, verificationData);
      
      // Calculate and store verification score
      const score = this.calculateVerificationScore(verificationData);
      await this.updateVerificationScore(session.case_id, score);
      
      // Trigger status transition if verification is complete
      if (score >= 70) {
        await caseService.triggerStatusTransition(
          session.case_id, 
          'verification_data_saved',
          { verificationData, verificationScore: score }
        );
      }
      
      return {
        success: true,
        score,
        caseId: session.case_id,
        completedFields: validationResult.completedFields,
        missingFields: validationResult.missingFields
      };
      
    } catch (error) {
      console.error('Save verification error:', error);
      throw error;
    }
  }

  /**
   * Update primary_data with verified information
   */
  async updatePrimaryData(caseId, verificationData) {
    // Get primary_data_id from case
    const caseResult = await db.query(
      'SELECT pdata_id FROM cases WHERE id = $1',
      [caseId]
    );
    const pdataId = caseResult.rows[0]?.pdata_id;
    
    if (!pdataId) return;
    
    const checklist = verificationData.checklistItems;
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    // Map verification data to primary_data fields
    if (checklist.quadrantRelation?.value) {
      updates.push(`quadrant_relation_id = $${++paramCount}`);
      params.push(this.mapQuadrantRelation(checklist.quadrantRelation.value));
    }
    
    if (checklist.engagement?.value) {
      updates.push(`engagement_type_id = $${++paramCount}`);
      params.push(this.mapEngagementType(checklist.engagement.value));
    }
    
    if (checklist.priority?.value) {
      updates.push(`priority_id = $${++paramCount}`);
      params.push(this.mapPriority(checklist.priority.value));
    }
    
    if (checklist.currentLocation?.value) {
      updates.push(`location_id = $${++paramCount}`);
      params.push(await this.getOrCreateLocation(checklist.currentLocation.value));
    }
    
    if (checklist.visaStatus?.value) {
      updates.push(`visa_status_id = $${++paramCount}`);
      params.push(this.mapVisaStatus(checklist.visaStatus.value));
    }
    
    if (checklist.h1Transfer?.value !== undefined) {
      updates.push(`is_h1_transfer = $${++paramCount}`);
      params.push(checklist.h1Transfer.value);
    }
    
    // Add notes if present
    if (verificationData.notes?.generalNotes) {
      updates.push(`professional_references = professional_references || $${++paramCount}::jsonb`);
      params.push(JSON.stringify({ verificationNotes: verificationData.notes.generalNotes }));
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      params.push(pdataId);
      
      const query = `
        UPDATE primary_data 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
      `;
      
      await db.query(query, params);
      console.log(`✅ Primary data updated for case ${caseId}`);
    }
  }

  /**
   * Update secondary_data with verification metadata
   */
  async updateSecondaryData(caseId, verificationData, userId) {
    // Get primary_data_id
    const caseResult = await db.query(
      'SELECT pdata_id FROM cases WHERE id = $1',
      [caseId]
    );
    const pdataId = caseResult.rows[0]?.pdata_id;
    
    if (!pdataId) return;
    
    // Check if secondary_data exists
    let sdataId;
    const existingResult = await db.query(
      'SELECT id FROM secondary_data WHERE primary_data_id = $1',
      [pdataId]
    );
    
    if (existingResult.rows.length === 0) {
      // Create secondary_data record
      const insertResult = await db.query(
        `INSERT INTO secondary_data (primary_data_id, created_at)
         VALUES ($1, NOW()) RETURNING id`,
        [pdataId]
      );
      sdataId = insertResult.rows[0].id;
    } else {
      sdataId = existingResult.rows[0].id;
    }
    
    // Update with verification details
    const query = `
      UPDATE secondary_data 
      SET 
        verified_by_user_id = $1,
        verification_notes = $2,
        updated_at = NOW()
      WHERE id = $3
    `;
    
    const notes = {
      intention: verificationData.notes?.intention,
      emotion: verificationData.notes?.emotion,
      generalNotes: verificationData.notes?.generalNotes,
      verificationScore: verificationData.verificationScore,
      verifiedAt: new Date()
    };
    
    await db.query(query, [userId, JSON.stringify(notes), sdataId]);
  }

  /**
   * Store detailed verification log
   */
  async storeVerificationLog(sessionId, verificationData) {
    const query = `
      INSERT INTO activity_logs (
        case_id, 
        action, 
        description, 
        user_id, 
        created_at
      )
      SELECT 
        case_id,
        'verification_completed',
        $1,
        user_id,
        NOW()
      FROM verification_sessions
      WHERE session_id = $2
    `;
    
    const description = JSON.stringify({
      score: this.calculateVerificationScore(verificationData),
      completedFields: Object.keys(verificationData.checklistItems).filter(
        key => verificationData.checklistItems[key]?.verified
      ),
      callDuration: verificationData.callMetadata?.duration,
      notes: verificationData.notes
    });
    
    await db.query(query, [description, sessionId]);
  }

  /**
   * Calculate verification score
   */
  calculateVerificationScore(verificationData) {
    let score = 0;
    let maxScore = 0;
    
    const weights = {
      quadrantRelation: 15,
      engagement: 15,
      priority: 10,
      currentLocation: 15,
      visaStatus: 20,
      h1Transfer: 10,
      intention: 10,
      emotion: 5
    };
    
    // Check checklist items
    for (const [field, weight] of Object.entries(weights)) {
      maxScore += weight;
      
      if (field === 'intention' || field === 'emotion') {
        if (verificationData.notes?.[field]?.score > 0) {
          score += (verificationData.notes[field].score / 5) * weight;
        }
      } else {
        if (verificationData.checklistItems?.[field]?.verified) {
          score += weight;
        }
      }
    }
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Get verification checklist template
   */
  getVerificationChecklist() {
    return {
      checklistItems: {
        quadrantRelation: {
          label: 'Quadrant Relation',
          type: 'select',
          options: ['Direct', 'Referral', 'Partner', 'Vendor'],
          required: true
        },
        engagement: {
          label: 'Engagement Type',
          type: 'select',
          options: ['W2', 'C2C', '1099', 'FTE'],
          required: true
        },
        priority: {
          label: 'Priority Level',
          type: 'select',
          options: ['Critical', 'High', 'Medium', 'Low'],
          required: true
        },
        currentLocation: {
          label: 'Current Location',
          type: 'text',
          required: true,
          enableGeocode: true
        },
        visaStatus: {
          label: 'Visa Status',
          type: 'select',
          options: ['Citizen', 'Green Card', 'H1B', 'OPT', 'CPT', 'Other'],
          required: true
        },
        h1Transfer: {
          label: 'H1 Transfer Required',
          type: 'boolean',
          required: false
        }
      },
      notesSection: {
        intention: {
          label: 'Candidate Intention',
          type: 'rating',
          scale: 5,
          description: 'How serious is the candidate about the opportunity?'
        },
        emotion: {
          label: 'Emotional State',
          type: 'select',
          options: ['Enthusiastic', 'Interested', 'Neutral', 'Hesitant', 'Not Interested']
        },
        generalNotes: {
          label: 'General Notes',
          type: 'textarea',
          placeholder: 'Additional observations from the call...'
        }
      }
    };
  }

  /**
   * Validate verification data
   */
  validateVerificationData(verificationData) {
    const errors = [];
    const completedFields = [];
    const missingFields = [];
    
    const requiredFields = [
      'quadrantRelation',
      'engagement',
      'priority', 
      'currentLocation',
      'visaStatus'
    ];
    
    for (const field of requiredFields) {
      if (verificationData.checklistItems?.[field]?.verified) {
        completedFields.push(field);
      } else {
        missingFields.push(field);
        errors.push(`${field} is required`);
      }
    }
    
    const score = this.calculateVerificationScore(verificationData);
    
    return {
      isValid: missingFields.length === 0,
      errors,
      completedFields,
      missingFields,
      score
    };
  }

  /**
   * Helper methods for mapping values
   */
  mapQuadrantRelation(value) {
    const mapping = {
      'Direct': 1,
      'Referral': 2,
      'Partner': 3,
      'Vendor': 4
    };
    return mapping[value] || 1;
  }
  
  mapEngagementType(value) {
    const mapping = {
      'W2': 1,
      'C2C': 2,
      '1099': 3,
      'FTE': 4
    };
    return mapping[value] || 1;
  }
  
  mapPriority(value) {
    const mapping = {
      'Critical': 1,
      'High': 2,
      'Medium': 3,
      'Low': 4
    };
    return mapping[value] || 3;
  }
  
  mapVisaStatus(value) {
    const mapping = {
      'Citizen': 1,
      'Green Card': 2,
      'H1B': 3,
      'OPT': 4,
      'CPT': 5,
      'Other': 6
    };
    return mapping[value] || 6;
  }
  
  async getOrCreateLocation(locationString) {
    // Parse location string (e.g., "Toronto, ON, Canada")
    const parts = locationString.split(',').map(p => p.trim());
    const city = parts[0] || locationString;
    
    // Check if exists
    const existing = await db.query(
      'SELECT id FROM locations WHERE city = $1',
      [city]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    
    // Create new location
    const result = await db.query(
      `INSERT INTO locations (city, state, country)
       VALUES ($1, $2, $3) RETURNING id`,
      [city, parts[1] || null, parts[2] || 'USA']
    );
    
    return result.rows[0].id;
  }
  
  // Session management
  async createSession(caseId, userId) {
    const sessionId = `VSESS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store session (you might want to create a sessions table)
    await db.query(
      `INSERT INTO activity_logs (case_id, user_id, action, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [caseId, userId, 'verification_session_start', sessionId]
    );
    
    return sessionId;
  }
  
  async getSession(sessionId) {
    const result = await db.query(
      `SELECT case_id, user_id FROM activity_logs 
       WHERE description = $1 AND action = 'verification_session_start'`,
      [sessionId]
    );
    return result.rows[0];
  }
  
  async updateVerificationScore(caseId, score) {
    // Store score in case metadata
    await db.query(
      `INSERT INTO activity_logs (case_id, action, description, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [caseId, 'verification_score', score.toString()]
    );
  }
}

module.exports = new VerificationService();
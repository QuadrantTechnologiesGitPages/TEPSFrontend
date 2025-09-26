// recruitment-backend/services/candidateService.js - PostgreSQL Version
const db = require('../data/database');

class CandidateService {
  /**
   * Get all candidates with filters
   */
  async getCandidates(filters = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          pd.phone_number as primary_phone,
          pd.years_of_experience,
          pd.current_employer_name,
          pd.skills as primary_skills
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
      
      if (filters.visa_status) {
        query += ` AND c.visa_status = $${++paramCount}`;
        params.push(filters.visa_status);
      }
      
      if (filters.search) {
        query += ` AND (c.name ILIKE $${++paramCount} OR c.email ILIKE $${paramCount} OR c.skills::text ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }
      
      query += ' ORDER BY c.created_at DESC';
      
      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        params.push(filters.limit);
      }
      
      const candidates = await db.all(query, params);
      return candidates;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  }

  /**
   * Get candidate by ID with activities
   */
  async getCandidateById(candidateId) {
    try {
      const query = `
        SELECT 
          c.*,
          pd.phone_number as primary_phone,
          pd.years_of_experience,
          pd.current_employer_name,
          pd.skills as primary_skills,
          pd.professional_references,
          sd.skype_id,
          sd.interview_availability
        FROM candidate c
        LEFT JOIN primary_data pd ON c.pdata_id = pd.id
        LEFT JOIN secondary_data sd ON c.sdata_id = sd.id
        WHERE c.id = $1
      `;
      
      const candidate = await db.get(query, [candidateId]);
      
      if (candidate) {
        const activities = await this.getCandidateActivities(candidateId);
        candidate.activityCount = activities.length;
      }
      
      return candidate;
    } catch (error) {
      console.error('Error fetching candidate:', error);
      throw error;
    }
  }
  
  /**
   * Get candidate activities
   */
  async getCandidateActivities(candidateId) {
    try {
      const query = `
        SELECT * FROM candidate_activities 
        WHERE candidate_id = $1 
        ORDER BY performed_at DESC
      `;
      const activities = await db.all(query, [candidateId]);
      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  /**
   * Create new candidate with primary_data
   */
  async createCandidate(candidateData, createdBy) {
    try {
      // Check if exists
      const existing = await db.get(
        'SELECT id FROM candidate WHERE email = $1',
        [candidateData.email]
      );
      
      if (existing) {
        throw new Error('Candidate with this email already exists');
      }
      
      // Use transaction for atomic creation
      const result = await db.transaction(async (client) => {
        // Create primary_data first
        const pdQuery = `
          INSERT INTO primary_data (
            name, email, phone_number, current_employer_name,
            years_of_experience, skills
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        
        const pdResult = await client.query(pdQuery, [
          candidateData.name,
          candidateData.email,
          candidateData.phone,
          candidateData.current_employer,
          candidateData.years_experience,
          candidateData.skills || []
        ]);
        
        const primaryDataId = pdResult.rows[0].id;
        
        // Create candidate
        const candidateQuery = `
          INSERT INTO candidate (
            name, email, phone, linkedin_url, current_location,
            visa_status, years_experience, skills, education,
            current_employer, status, source, availability,
            expected_salary, notes, pdata_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id
        `;
        
        const candidateResult = await client.query(candidateQuery, [
          candidateData.name,
          candidateData.email,
          candidateData.phone,
          candidateData.linkedin_url,
          candidateData.current_location,
          candidateData.visa_status,
          candidateData.years_experience,
          candidateData.skills || [],
          candidateData.education,
          candidateData.current_employer,
          candidateData.status || 'Active',
          candidateData.source || 'Manual',
          candidateData.availability,
          candidateData.expected_salary,
          candidateData.notes,
          primaryDataId,
          createdBy
        ]);
        
        const candidateId = candidateResult.rows[0].id;
        
        // Log activity
        const activityQuery = `
          INSERT INTO candidate_activities (
            candidate_id, activity_type, description, performed_by, changes
          ) VALUES ($1, $2, $3, $4, $5)
        `;
        
        await client.query(activityQuery, [
          candidateId,
          'created',
          'Candidate profile created manually',
          createdBy,
          JSON.stringify({ source: 'Manual Entry' })
        ]);
        
        return { id: candidateId };
      });
      
      // Get full candidate data
      const candidate = await this.getCandidateById(result.id);
      
      // Sync to Azure Search
      const candidateSearchSync = require('./candidateSearchSync');
      try {
        await candidateSearchSync.onCandidateCreated(candidate);
        console.log(`✅ Candidate ${candidate.name} synced to Azure Search`);
      } catch (syncError) {
        console.error('Azure Search sync failed:', syncError);
      }
      
      return {
        candidateId: result.id,
        candidate
      };
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  /**
   * Update candidate
   */
  async updateCandidate(candidateId, updates, updatedBy) {
    try {
      const currentCandidate = await this.getCandidateById(candidateId);
      if (!currentCandidate) {
        throw new Error('Candidate not found');
      }
      
      // Track changes
      const changes = {};
      Object.keys(updates).forEach(key => {
        if (currentCandidate[key] !== updates[key]) {
          changes[key] = {
            old: currentCandidate[key],
            new: updates[key]
          };
        }
      });
      
      // Build update query dynamically
      const updateFields = [];
      const params = [];
      let paramCount = 0;
      
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
          updateFields.push(`${key} = $${++paramCount}`);
          params.push(updates[key]);
        }
      });
      
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateFields.push(`last_updated_by = $${++paramCount}`);
        params.push(updatedBy);
        params.push(candidateId);
        
        const updateQuery = `
          UPDATE candidate 
          SET ${updateFields.join(', ')}
          WHERE id = $${++paramCount}
          RETURNING *
        `;
        
        await db.run(updateQuery, params);
        
        // Log activity
        if (Object.keys(changes).length > 0) {
          await db.run(
            `INSERT INTO candidate_activities (candidate_id, activity_type, description, performed_by, changes)
             VALUES ($1, $2, $3, $4, $5)`,
            [candidateId, 'updated', `Updated: ${Object.keys(changes).join(', ')}`, updatedBy, JSON.stringify(changes)]
          );
        }
      }
      
      const candidate = await this.getCandidateById(candidateId);
      
      // Sync to Azure Search
      const candidateSearchSync = require('./candidateSearchSync');
      try {
        await candidateSearchSync.onCandidateUpdated(candidate);
        console.log(`✅ Candidate ${candidate.name} updates synced to Azure Search`);
      } catch (syncError) {
        console.error('Azure Search sync failed:', syncError);
      }
      
      return { candidate };
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  }

  /**
   * Update candidate status
   */
  async updateCandidateStatus(candidateId, status, reason, updatedBy) {
    try {
      const currentCandidate = await this.getCandidateById(candidateId);
      if (!currentCandidate) {
        throw new Error('Candidate not found');
      }
      
      await db.run(
        'UPDATE candidate SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, candidateId]
      );
      
      await db.run(
        `INSERT INTO candidate_activities (candidate_id, activity_type, description, performed_by, changes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          candidateId,
          'status_changed',
          `Status changed from ${currentCandidate.status} to ${status}${reason ? `: ${reason}` : ''}`,
          updatedBy,
          JSON.stringify({ oldStatus: currentCandidate.status, newStatus: status, reason })
        ]
      );
      
      const candidate = await this.getCandidateById(candidateId);
      
      // Sync to Azure Search
      const candidateSearchSync = require('./candidateSearchSync');
      try {
        await candidateSearchSync.onCandidateUpdated(candidate);
        console.log(`✅ Candidate ${candidate.name} status synced to Azure Search`);
      } catch (syncError) {
        console.error('Azure Search sync failed:', syncError);
      }
      
      return { candidate };
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }
  
  /**
   * Add note to candidate
   */
  async addNote(candidateId, note, addedBy) {
    try {
      const candidate = await this.getCandidateById(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }
      
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${addedBy}: ${note}`;
      const updatedNotes = candidate.notes 
        ? `${candidate.notes}\n\n${newNote}`
        : newNote;
      
      await db.run(
        'UPDATE candidate SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [updatedNotes, candidateId]
      );
      
      await db.run(
        `INSERT INTO candidate_activities (candidate_id, activity_type, description, performed_by, changes)
         VALUES ($1, $2, $3, $4, $5)`,
        [candidateId, 'note_added', 'Added a note', addedBy, JSON.stringify({ note })]
      );
      
      const updatedCandidate = await this.getCandidateById(candidateId);
      
      // Sync to Azure Search
      const candidateSearchSync = require('./candidateSearchSync');
      try {
        await candidateSearchSync.onCandidateUpdated(updatedCandidate);
        console.log(`✅ Candidate ${updatedCandidate.name} notes synced to Azure Search`);
      } catch (syncError) {
        console.error('Azure Search sync failed:', syncError);
      }
      
      return { candidate: updatedCandidate };
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }
  
  /**
   * Get candidate stats
   */
  async getCandidateStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN status = 'Placed' THEN 1 ELSE 0 END) as placed,
          SUM(CASE WHEN status = 'On Hold' THEN 1 ELSE 0 END) as "onHold"
        FROM candidate
      `;
      
      const stats = await db.get(query);
      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  // Other methods remain similar with PostgreSQL syntax adjustments...
}

module.exports = new CandidateService();
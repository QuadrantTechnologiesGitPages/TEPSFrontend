// recruitment-backend/services/candidateService.js - NEW FILE
const database = require('../utils/database');


class CandidateService {
  /**
   * Get all candidates with filters
   */
  async getCandidates(filters = {}) {
    try {
      const candidates = await database.getCandidates(filters);
      return candidates;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  }

  /**
   * Get candidate by ID
   */
  async getCandidateById(candidateId) {
    try {
      const candidate = await database.getCandidateById(candidateId);
      
      if (candidate) {
        const activities = await database.getCandidateActivities(candidateId);
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
      const activities = await database.getCandidateActivities(candidateId);
      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  /**
   * Create new candidate manually
   */
  async createCandidate(candidateData, createdBy) {
    try {
      const existing = await database.getCandidateByEmail(candidateData.email);
      if (existing) {
        throw new Error('Candidate with this email already exists');
      }
      
      candidateData.created_by = createdBy;
      const result = await database.createCandidate(candidateData);
      
      await database.logCandidateActivity(
        result.id,
        'created',
        'Candidate profile created manually',
        createdBy,
        { source: 'Manual Entry' }
      );
      
      if (global.sendNotification) {
        await global.sendNotification(createdBy, {
          type: 'candidate_created',
          title: 'Candidate Created',
          message: `${candidateData.name} has been added to the system`,
          priority: 'normal',
          data: { candidateId: result.id },
          actionUrl: `/candidates/${result.id}`
        });
      }
      
      const candidate = await database.getCandidateById(result.id);
      
      return {
        candidateId: result.id,
        candidate
      };
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  async createCandidateFromResponse(responseId, createdBy) {
    try {
      const result = await database.createCandidateFromResponse(responseId, createdBy);
      
      if (global.sendNotification) {
        await global.sendNotification(createdBy, {
          type: 'candidate_created',
          title: 'Candidate Created from Response',
          message: 'A new candidate has been created from form response',
          priority: 'normal',
          data: { candidateId: result.id, responseId },
          actionUrl: `/candidates/${result.id}`
        });
      }
      
      const candidate = await database.getCandidateById(result.id);
      
      return {
        candidateId: result.id,
        candidate
      };
    } catch (error) {
      console.error('Error creating candidate from response:', error);
      throw error;
    }
  }

  async updateCandidate(candidateId, updates, updatedBy) {
    try {
      const currentCandidate = await database.getCandidateById(candidateId);
      if (!currentCandidate) {
        throw new Error('Candidate not found');
      }
      
      const changes = {};
      Object.keys(updates).forEach(key => {
        if (currentCandidate[key] !== updates[key]) {
          changes[key] = {
            old: currentCandidate[key],
            new: updates[key]
          };
        }
      });
      
      await database.updateCandidate(candidateId, updates, updatedBy);
      
      if (Object.keys(changes).length > 0) {
        await database.logCandidateActivity(
          candidateId,
          'updated',
          `Updated: ${Object.keys(changes).join(', ')}`,
          updatedBy,
          changes
        );
      }
      
      const candidate = await database.getCandidateById(candidateId);
      
      return { candidate };
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  }

async updateCandidateStatus(candidateId, status, reason, updatedBy) {
    try {
      const currentCandidate = await database.getCandidateById(candidateId);
      if (!currentCandidate) {
        throw new Error('Candidate not found');
      }
      
      await database.updateCandidate(
        candidateId,
        { status },
        updatedBy
      );
      
      await database.logCandidateActivity(
        candidateId,
        'status_changed',
        `Status changed from ${currentCandidate.status} to ${status}${reason ? `: ${reason}` : ''}`,
        updatedBy,
        {
          oldStatus: currentCandidate.status,
          newStatus: status,
          reason
        }
      );
      
      const candidate = await database.getCandidateById(candidateId);
      
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
      const candidate = await database.getCandidateById(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }
      
      const currentNotes = candidate.notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${addedBy}: ${note}`;
      const updatedNotes = currentNotes 
        ? `${currentNotes}\n\n${newNote}`
        : newNote;
      
      await database.updateCandidate(
        candidateId,
        { notes: updatedNotes },
        addedBy
      );
      
      await database.logCandidateActivity(
        candidateId,
        'note_added',
        'Added a note',
        addedBy,
        { note }
      );
      
      const updatedCandidate = await database.getCandidateById(candidateId);
      
      return { candidate: updatedCandidate };
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }
  async deactivateCandidate(candidateId, deactivatedBy) {
    try {
      const candidate = await database.getCandidateById(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }
      
      await database.updateCandidate(
        candidateId,
        { status: 'Inactive' },
        deactivatedBy
      );
      
      await database.logCandidateActivity(
        candidateId,
        'deactivated',
        'Candidate deactivated',
        deactivatedBy,
        { previousStatus: candidate.status }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error deactivating candidate:', error);
      throw error;
    }
  }

 async getCandidateStats() {
    try {
      const stats = await database.getCandidateStats();
      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  async exportToCSV(filters = {}) {
    try {
      const candidates = await database.getCandidates(filters);
      
      if (candidates.length === 0) {
        return 'No candidates found';
      }
      
      const headers = [
        'ID', 'Name', 'Email', 'Phone', 'LinkedIn',
        'Location', 'Visa Status', 'Experience', 'Skills',
        'Education', 'Current Employer', 'Status', 'Source',
        'Referred By', 'Availability', 'Expected Salary',
        'Created Date', 'Created By'
      ];
      
      const csv = [headers.join(',')];
      
      candidates.forEach(c => {
        const row = [
          c.id,
          `"${c.name || ''}"`,
          c.email,
          c.phone || '',
          c.linkedin_url || '',
          `"${c.current_location || ''}"`,
          c.visa_status || '',
          c.years_experience || '',
          `"${(c.skills || []).join('; ')}"`,
          c.education || '',
          `"${c.current_employer || ''}"`,
          c.status,
          c.source || '',
          c.referred_by || '',
          c.availability || '',
          c.expected_salary || '',
          c.created_at,
          c.created_by
        ];
        
        csv.push(row.join(','));
      });
      
      return csv.join('\n');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(candidateIds, status, updatedBy) {
    try {
      let updated = 0;
      const errors = [];
      
      for (const candidateId of candidateIds) {
        try {
          await this.updateCandidateStatus(
            candidateId,
            status,
            'Bulk update',
            updatedBy
          );
          updated++;
        } catch (error) {
          errors.push({ candidateId, error: error.message });
        }
      }
      
      return {
        updated,
        failed: errors.length,
        errors
      };
    } catch (error) {
      console.error('Error bulk updating:', error);
      throw error;
    }
  }

}

module.exports = new CandidateService();
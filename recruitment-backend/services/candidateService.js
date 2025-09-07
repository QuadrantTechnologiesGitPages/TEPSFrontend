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
        // Get activity count
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
      // Check if candidate with email already exists
      const existing = await database.getCandidateByEmail(candidateData.email);
      if (existing) {
        throw new Error('Candidate with this email already exists');
      }
      
      // Add created_by field
      candidateData.created_by = createdBy;
      
      // Create candidate
      const result = await database.createCandidate(candidateData);
      
      // Log activity
      await database.logCandidateActivity(
        result.id,
        'created',
        'Candidate profile created manually',
        createdBy,
        { source: 'Manual Entry' }
      );
      
      // Send notification
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
      
      // Fetch and return the created candidate
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

  /**
   * Create candidate from form response
   */
  async createCandidateFromResponse(responseId, createdBy) {
    try {
      // This will handle all the mapping and creation
      const result = await database.createCandidateFromResponse(responseId, createdBy);
      
      // Send notification
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
      
      // Fetch and return the created candidate
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

  /**
   * Update candidate
   */
  async updateCandidate(candidateId, updates, updatedBy) {
    try {
      // Get current candidate data for comparison
      const currentCandidate = await database.getCandidateById(candidateId);
      if (!currentCandidate) {
        throw new Error('Candidate not found');
      }
      
      // Track what changed
      const changes = {};
      Object.keys(updates).forEach(key => {
        if (currentCandidate[key] !== updates[key]) {
          changes[key] = {
            old: currentCandidate[key],
            new: updates[key]
          };
        }
      });
      
      // Update candidate
      await database.updateCandidate(candidateId, updates, updatedBy);
      
      // Log activity with changes
      if (Object.keys(changes).length > 0) {
        await database.logCandidateActivity(
          candidateId,
          'updated',
          `Updated: ${Object.keys(changes).join(', ')}`,
          updatedBy,
          changes
        );
      }
      
      // Fetch and return updated candidate
      const candidate = await database.getCandidateById(candidateId);
      
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
      const currentCandidate = await database.getCandidateById(candidateId);
      if (!currentCandidate) {
        throw new Error('Candidate not found');
      }
      
      // Update status
      await database.updateCandidate(
        candidateId,
        { status },
        updatedBy
      );
      
      // Log activity
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
      
      // Fetch and return updated candidate
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
      
      // Append note to existing notes
      const currentNotes = candidate.notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${addedBy}: ${note}`;
      const updatedNotes = currentNotes 
        ? `${currentNotes}\n\n${newNote}`
        : newNote;
      
      // Update candidate
      await database.updateCandidate(
        candidateId,
        { notes: updatedNotes },
        addedBy
      );
      
      // Log activity
      await database.logCandidateActivity(
        candidateId,
        'note_added',
        'Added a note',
        addedBy,
        { note }
      );
      
      // Fetch and return updated candidate
      const updatedCandidate = await database.getCandidateById(candidateId);
      
      return { candidate: updatedCandidate };
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  /**
   * Deactivate candidate (soft delete)
   */
  async deactivateCandidate(candidateId, deactivatedBy) {
    try {
      const candidate = await database.getCandidateById(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }
      
      // Update status to Inactive
      await database.updateCandidate(
        candidateId,
        { status: 'Inactive' },
        deactivatedBy
      );
      
      // Log activity
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

  /**
   * Get candidate statistics
   */
  async getCandidateStats() {
    try {
      const allCandidates = await database.getCandidates({});
      
      const stats = {
        total: allCandidates.length,
        active: allCandidates.filter(c => c.status === 'Active').length,
        inactive: allCandidates.filter(c => c.status === 'Inactive').length,
        placed: allCandidates.filter(c => c.status === 'Placed').length,
        onHold: allCandidates.filter(c => c.status === 'On Hold').length,
        byVisa: {},
        bySource: {},
        recentlyAdded: allCandidates.filter(c => {
          const createdDate = new Date(c.created_at);
          const daysSince = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
          return daysSince <= 7;
        }).length
      };
      
      // Count by visa status
      allCandidates.forEach(c => {
        if (c.visa_status) {
          stats.byVisa[c.visa_status] = (stats.byVisa[c.visa_status] || 0) + 1;
        }
      });
      
      // Count by source
      allCandidates.forEach(c => {
        const source = c.source || 'Unknown';
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        placed: 0,
        onHold: 0,
        byVisa: {},
        bySource: {},
        recentlyAdded: 0
      };
    }
  }

  /**
   * Export candidates to CSV
   */
  async exportToCSV(filters = {}) {
    try {
      const candidates = await database.getCandidates(filters);
      
      if (candidates.length === 0) {
        return 'No candidates found';
      }
      
      // Define CSV headers
      const headers = [
        'ID', 'Name', 'Email', 'Phone', 'LinkedIn',
        'Location', 'Visa Status', 'Experience', 'Skills',
        'Education', 'Current Employer', 'Status', 'Source',
        'Referred By', 'Availability', 'Expected Salary',
        'Created Date', 'Created By'
      ];
      
      // Build CSV
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
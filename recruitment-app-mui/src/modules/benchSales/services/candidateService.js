// recruitment-app-mui/src/modules/benchSales/services/candidateService.js - NEW FILE

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class CandidateService {
  // Get user email from localStorage
  getUserEmail() {
    return localStorage.getItem('userEmail') || 'system';
  }

  // ==================== CANDIDATE OPERATIONS ====================
  
  /**
   * Get all candidates with filters
   */
  async getCandidates(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.visa_status) params.append('visa_status', filters.visa_status);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await fetch(`${API_BASE}/candidates?${params}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch candidates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  }

  /**
   * Get single candidate by ID
   */
  async getCandidateById(candidateId) {
    try {
      const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Candidate not found');
        throw new Error('Failed to fetch candidate');
      }
      
      return await response.json();
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
      const response = await fetch(`${API_BASE}/candidates/${candidateId}/activities`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch activities');
      return await response.json();
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  /**
   * Create new candidate manually
   */
  async createCandidate(candidateData) {
    try {
      const response = await fetch(`${API_BASE}/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify(candidateData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create candidate');
      }
      
      return data;
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  /**
   * Create candidate from form response
   */
  async createCandidateFromResponse(responseId) {
    try {
      const response = await fetch(`${API_BASE}/candidates/from-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({ responseId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create candidate from response');
      }
      
      return data;
    } catch (error) {
      console.error('Error creating candidate from response:', error);
      throw error;
    }
  }

  /**
   * Update candidate
   */
  async updateCandidate(candidateId, updates) {
    try {
      const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update candidate');
      }
      
      return data;
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  }

  /**
   * Update candidate status
   */
  async updateCandidateStatus(candidateId, status, reason = '') {
    try {
      const response = await fetch(`${API_BASE}/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({ status, reason })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      
      return data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  /**
   * Add note to candidate
   */
  async addNote(candidateId, note) {
    try {
      const response = await fetch(`${API_BASE}/candidates/${candidateId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({ note })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add note');
      }
      
      return data;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) candidate
   */
  async deleteCandidate(candidateId) {
    try {
      const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete candidate');
      }
      
      return data;
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  }

  /**
   * Get candidate statistics
   */
  async getCandidateStats() {
    try {
      const response = await fetch(`${API_BASE}/candidates/stats`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Export candidates to CSV
   */
  async exportToCSV(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.visa_status) params.append('visa_status', filters.visa_status);
      
      const response = await fetch(`${API_BASE}/candidates/export/csv?${params}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to export CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  /**
   * Bulk update candidate status
   */
  async bulkUpdateStatus(candidateIds, status) {
    try {
      const response = await fetch(`${API_BASE}/candidates/bulk/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({ candidateIds, status })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to bulk update');
      }
      
      return data;
    } catch (error) {
      console.error('Error bulk updating:', error);
      throw error;
    }
  }

  /**
   * Search candidates
   */
  async searchCandidates(query) {
    try {
      return await this.getCandidates({ search: query });
    } catch (error) {
      console.error('Error searching candidates:', error);
      throw error;
    }
  }

  /**
   * Format candidate data for display
   */
  formatCandidate(candidate) {
    return {
      ...candidate,
      skillsDisplay: Array.isArray(candidate.skills) 
        ? candidate.skills.join(', ') 
        : candidate.skills || '',
      statusBadgeClass: this.getStatusBadgeClass(candidate.status),
      visaBadgeClass: this.getVisaBadgeClass(candidate.visa_status),
      createdDate: new Date(candidate.created_at).toLocaleDateString(),
      updatedDate: candidate.updated_at 
        ? new Date(candidate.updated_at).toLocaleDateString() 
        : null
    };
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status) {
    const statusClasses = {
      'Active': 'badge-success',
      'Inactive': 'badge-danger',
      'Placed': 'badge-info',
      'On Hold': 'badge-warning'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  /**
   * Get visa badge class
   */
  getVisaBadgeClass(visa) {
    const visaClasses = {
      'H1B': 'badge-primary',
      'OPT-EAD': 'badge-info',
      'GC-EAD': 'badge-success',
      'Green Card': 'badge-success',
      'US Citizen': 'badge-dark'
    };
    return visaClasses[visa] || 'badge-secondary';
  }

  /**
   * Validate candidate data
   */
  validateCandidateData(data) {
    const errors = {};
    
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Name is required (minimum 2 characters)';
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Valid email is required';
    }
    
    if (data.phone && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
      errors.phone = 'Invalid phone number format';
    }
    
    if (data.linkedin_url && !data.linkedin_url.includes('linkedin.com')) {
      errors.linkedin_url = 'Invalid LinkedIn URL';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export default new CandidateService();
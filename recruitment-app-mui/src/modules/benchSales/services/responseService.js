// src/modules/benchSales/services/responseService.js

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ResponseService {
  getUserEmail() {
    return localStorage.getItem('userEmail') || 'system';
  }

  // ==================== RESPONSE SUBMISSION (Public) ====================
  
  async submitResponse(token, responses) {
    try {
      const response = await fetch(`${API_BASE}/responses/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          responses
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit form');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  }

  // ==================== RESPONSE MANAGEMENT (BSM) ====================
  
  async getResponses(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.processed !== undefined) params.append('processed', filters.processed);
      if (filters.caseCreated !== undefined) params.append('caseCreated', filters.caseCreated);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      
      const response = await fetch(`${API_BASE}/responses?${params}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch responses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching responses:', error);
      throw error;
    }
  }

  async getResponseById(responseId) {
    try {
      const response = await fetch(`${API_BASE}/responses/${responseId}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Response not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching response:', error);
      throw error;
    }
  }

  async markAsProcessed(responseId) {
    try {
      const response = await fetch(`${API_BASE}/responses/${responseId}/process`, {
        method: 'POST',
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to process response');
      return await response.json();
    } catch (error) {
      console.error('Error marking as processed:', error);
      throw error;
    }
  }

  async createCandidate(responseId, additionalData = {}) {
    try {
      const response = await fetch(`${API_BASE}/responses/${responseId}/create-candidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify(additionalData)
      });
      
      if (!response.ok) throw new Error('Failed to create candidate');
      return await response.json();
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  async deleteResponse(responseId) {
    try {
      const response = await fetch(`${API_BASE}/responses/${responseId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete response');
      return await response.json();
    } catch (error) {
      console.error('Error deleting response:', error);
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================
  
  async bulkProcess(responseIds) {
    try {
      const response = await fetch(`${API_BASE}/responses/bulk/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({ responseIds })
      });
      
      if (!response.ok) throw new Error('Failed to bulk process');
      return await response.json();
    } catch (error) {
      console.error('Error bulk processing:', error);
      throw error;
    }
  }

  // ==================== EXPORT ====================
  
  async exportToCSV(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.processed !== undefined) params.append('processed', filters.processed);
      
      const response = await fetch(`${API_BASE}/responses/export/csv?${params}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to export CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `responses-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  // ==================== STATISTICS ====================
  
  async getStats() {
    try {
      const response = await fetch(`${API_BASE}/responses/stats`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
}

export default new ResponseService();
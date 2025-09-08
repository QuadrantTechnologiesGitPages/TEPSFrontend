// recruitment-app-mui/src/modules/benchSales/services/candidateService.js

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class CandidateService {
  getUserEmail() {
    return localStorage.getItem('userEmail') || 'system';
  }

  async getCandidates(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_BASE}/candidates?${queryParams}`, {
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

  async getCandidateById(candidateId) {
    try {
      const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch candidate');
      return await response.json();
    } catch (error) {
      console.error('Error fetching candidate:', error);
      throw error;
    }
  }

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
      if (!response.ok) throw new Error(data.error || 'Failed to create candidate');
      return data;
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

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
      if (!response.ok) throw new Error(data.error || 'Failed to create candidate');
      return data;
    } catch (error) {
      console.error('Error creating candidate from response:', error);
      throw error;
    }
  }

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
      if (!response.ok) throw new Error(data.error || 'Failed to update candidate');
      return data;
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  }

  async deactivateCandidate(candidateId) {
    try {
      const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to deactivate candidate');
      return data;
    } catch (error) {
      console.error('Error deactivating candidate:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const response = await fetch(`${API_BASE}/candidates/stats`, {
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

  async exportToCSV() {
    try {
      const response = await fetch(`${API_BASE}/candidates/export/csv`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to export');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidates-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }
}

export default new CandidateService();
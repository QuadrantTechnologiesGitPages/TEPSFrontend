// src/modules/benchSales/services/formService.js
const API_URL = 'http://localhost:5000/api';

class FormService {
  // Send form to candidate
  async sendForm(formData) {
    try {
      const response = await fetch(`${API_URL}/forms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send form');
      }
      
      return data;
    } catch (error) {
      console.error('Error sending form:', error);
      throw error;
    }
  }

  // Get form by token (for candidate)
  async getForm(token) {
    try {
      const response = await fetch(`${API_URL}/forms/${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Form not found');
      }
      
      return data.form;
    } catch (error) {
      console.error('Error getting form:', error);
      throw error;
    }
  }

  // Submit form responses (by candidate)
  async submitForm(token, responses) {
    try {
      const response = await fetch(`${API_URL}/forms/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responses })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }
      
      return data;
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  }

  // Get form status
  async getFormStatus(token) {
    try {
      const response = await fetch(`${API_URL}/forms/${token}/status`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get status');
      }
      
      return data.status;
    } catch (error) {
      console.error('Error getting form status:', error);
      throw error;
    }
  }

  // Get forms by case ID
  async getFormsByCase(caseId) {
    try {
      const response = await fetch(`${API_URL}/forms/case/${caseId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get forms');
      }
      
      return data.forms;
    } catch (error) {
      console.error('Error getting case forms:', error);
      throw error;
    }
  }

  // Get form responses
  async getFormResponses(token) {
    try {
      const response = await fetch(`${API_URL}/forms/${token}/responses`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'No responses found');
      }
      
      return data.responses;
    } catch (error) {
      console.error('Error getting responses:', error);
      throw error;
    }
  }

  // Resend form email
  async resendForm(token) {
    try {
      const response = await fetch(`${API_URL}/forms/${token}/resend`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend form');
      }
      
      return data;
    } catch (error) {
      console.error('Error resending form:', error);
      throw error;
    }
  }

  // Check for responses manually
  async checkResponses(caseId) {
    try {
      const response = await fetch(`${API_URL}/forms/check-responses/${caseId}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check responses');
      }
      
      return data.result;
    } catch (error) {
      console.error('Error checking responses:', error);
      throw error;
    }
  }

  // Get all pending forms
  async getPendingForms() {
    try {
      const response = await fetch(`${API_URL}/forms/pending/all`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get pending forms');
      }
      
      return data.forms;
    } catch (error) {
      console.error('Error getting pending forms:', error);
      throw error;
    }
  }
}

export default new FormService();
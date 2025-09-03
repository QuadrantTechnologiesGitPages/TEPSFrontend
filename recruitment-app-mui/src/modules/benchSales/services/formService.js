// src/modules/benchSales/services/formService.js

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class FormService {
  // Get user email from localStorage
  getUserEmail() {
    return localStorage.getItem('userEmail') || 'system';
  }

  // ==================== TEMPLATE OPERATIONS ====================
  
  async getTemplates(includeInactive = false) {
    try {
      const response = await fetch(`${API_BASE}/templates${includeInactive ? '?includeInactive=true' : ''}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  async getTemplateById(templateId) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Template not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }

  async createTemplate(templateData) {
    try {
      const response = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) throw new Error('Failed to create template');
      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId, updates) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update template');
      return await response.json();
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete template');
      return await response.json();
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // ==================== FORM SENDING ====================
  
  async sendForm(formData) {
    try {
      const response = await fetch(`${API_BASE}/templates/send-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({
          ...formData,
          senderEmail: formData.senderEmail || this.getUserEmail(),
          senderName: formData.senderName || localStorage.getItem('userName') || 'Recruitment Team'
        })
      });
      
      if (!response.ok) throw new Error('Failed to send form');
      return await response.json();
    } catch (error) {
      console.error('Error sending form:', error);
      throw error;
    }
  }

  async getFormByToken(token) {
    try {
      const response = await fetch(`${API_BASE}/templates/form/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Form not found');
        if (response.status === 410) throw new Error('Form has expired');
        if (response.status === 409) throw new Error('Form already submitted');
        throw new Error('Failed to load form');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching form:', error);
      throw error;
    }
  }

  // ==================== FIELD LIBRARY ====================
  
  async getFieldLibrary() {
    try {
      const response = await fetch(`${API_BASE}/templates/fields/library`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch field library');
      return await response.json();
    } catch (error) {
      console.error('Error fetching field library:', error);
      throw error;
    }
  }

  async addFieldToLibrary(fieldData) {
    try {
      const response = await fetch(`${API_BASE}/templates/fields/library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify(fieldData)
      });
      
      if (!response.ok) throw new Error('Failed to add field');
      return await response.json();
    } catch (error) {
      console.error('Error adding field to library:', error);
      throw error;
    }
  }
}

export default new FormService();
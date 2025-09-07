// src/modules/benchSales/services/formService.js - UPDATED VERSION

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
      const userEmail = this.getUserEmail();
      
      // IMPORTANT: Add created_by to the template data
      const dataToSend = {
        ...templateData,
        created_by: templateData.created_by || userEmail  // Use provided created_by or default to userEmail
      };
      
      const response = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify(dataToSend)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create template');
      }
      
      // Return success format expected by FormDesigner
      return { 
        success: true, 
        template: responseData.template || responseData,
        id: responseData.id || responseData.template?.id
      };
    } catch (error) {
      console.error('Error creating template:', error);
      // Return error format expected by FormDesigner
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async updateTemplate(templateId, updates) {
    try {
      const userEmail = this.getUserEmail();
      
      // IMPORTANT: Add updated_by to the updates
      const dataToSend = {
        ...updates,
        updated_by: updates.updated_by || userEmail  // Use provided updated_by or default to userEmail
      };
      
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify(dataToSend)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update template');
      }
      
      // Return success format expected by FormDesigner
      return { 
        success: true, 
        template: responseData.template || responseData,
        id: templateId
      };
    } catch (error) {
      console.error('Error updating template:', error);
      // Return error format expected by FormDesigner
      return { 
        success: false, 
        error: error.message 
      };
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
      const userEmail = this.getUserEmail();
      
      const response = await fetch(`${API_BASE}/templates/send-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          ...formData,
          senderEmail: formData.senderEmail || userEmail,
          senderName: formData.senderName || localStorage.getItem('userName') || 'Recruitment Team',
          created_by: formData.created_by || userEmail  // Add created_by here too
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
      const userEmail = this.getUserEmail();
      
      const response = await fetch(`${API_BASE}/templates/fields/library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          ...fieldData,
          created_by: fieldData.created_by || userEmail  // Add created_by for field library too
        })
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
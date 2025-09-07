// recruitment-app-mui/src/modules/benchSales/services/formTemplateService.js - NEW FILE

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class FormTemplateService {
  // Get user email from localStorage
  getUserEmail() {
    return localStorage.getItem('userEmail') || 'system';
  }

  /**
   * Get all templates
   */
  async getTemplates() {
    try {
      const response = await fetch(`${API_BASE}/templates`, {
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

  /**
   * Get template by ID
   */
  async getTemplateById(templateId) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Template not found');
        throw new Error('Failed to fetch template');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }

  /**
   * Create new template
   */
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create template');
      }
      
      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update template');
      }
      
      return data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete template');
      }
      
      return data;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Send form from template
   */
  async sendForm(templateId, recipients, subject = null) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({ recipients, subject })
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

  /**
   * Get form fields library
   */
  async getFieldsLibrary() {
    try {
      const response = await fetch(`${API_BASE}/templates/fields/library`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch fields library');
      return await response.json();
    } catch (error) {
      console.error('Error fetching fields library:', error);
      throw error;
    }
  }

  /**
   * Preview template
   */
  async previewTemplate(templateId) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}/preview`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to preview template');
      return await response.json();
    } catch (error) {
      console.error('Error previewing template:', error);
      throw error;
    }
  }

  /**
   * Clone template
   */
  async cloneTemplate(templateId, newName) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': this.getUserEmail()
        },
        body: JSON.stringify({ name: newName })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone template');
      }
      
      return data;
    } catch (error) {
      console.error('Error cloning template:', error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(templateId) {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}/stats`, {
        headers: {
          'x-user-email': this.getUserEmail()
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch template stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching template stats:', error);
      throw error;
    }
  }
}

export default new FormTemplateService();
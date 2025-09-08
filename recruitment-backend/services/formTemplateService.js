// recruitment-backend/services/formTemplateService.js
const database = require('../utils/database');
const crypto = require('crypto');

class FormTemplateService {
  // ==================== TEMPLATE MANAGEMENT ====================
  
  /**
   * Create a new form template
   */
  async createTemplate(templateData, createdBy) {
    try {
      // Validate template data
      this.validateTemplate(templateData);
      
      // Create template in database
      const result = await database.createFormTemplate({
        name: templateData.name,
        description: templateData.description,
        fields: templateData.fields,
        createdBy: createdBy
      });
      
      // Log activity
      await database.logActivity(
        null,
        null,
        'template_created',
        `Form template "${templateData.name}" created by ${createdBy}`,
        createdBy
      );
      
      return {
        success: true,
        templateId: result.id,
        message: 'Template created successfully'
      };
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }
  
  /**
   * Get all active templates
   */
  async getTemplates(activeOnly = true) {
    try {
      const templates = await database.getFormTemplates(activeOnly);
      return templates;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }
  
  /**
   * Get a single template by ID
   */
  async getTemplateById(templateId) {
    try {
      const template = await database.getFormTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      return template;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing template
   */
  async updateTemplate(templateId, updates, updatedBy) {
    try {
      // Validate if template exists
      const existing = await this.getTemplateById(templateId);
      if (!existing) {
        throw new Error('Template not found');
      }
      
      // Validate updates
      if (updates.fields) {
        this.validateTemplate({ fields: updates.fields });
      }
      
      // Build update query
      const updateFields = [];
      const params = [];
      
      if (updates.name) {
        updateFields.push('name = ?');
        params.push(updates.name);
      }
      
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        params.push(updates.description);
      }
      
      if (updates.fields) {
        updateFields.push('fields = ?');
        params.push(JSON.stringify(updates.fields));
      }
      
      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(updates.is_active ? 1 : 0);
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(templateId);
      
      await database.run(
        `UPDATE form_templates SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
      
      // Log activity
      await database.logActivity(
        null,
        null,
        'template_updated',
        `Template "${existing.name}" updated by ${updatedBy}`,
        updatedBy
      );
      
      return {
        success: true,
        message: 'Template updated successfully'
      };
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }
  
  /**
   * Delete a template (soft delete by marking inactive)
   */
  async deleteTemplate(templateId, deletedBy) {
    try {
      const template = await this.getTemplateById(templateId);
      
      // Don't delete default template
      if (template.is_default) {
        throw new Error('Cannot delete default template');
      }
      
      await database.run(
        'UPDATE form_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [templateId]
      );
      
      // Log activity
      await database.logActivity(
        null,
        null,
        'template_deleted',
        `Template "${template.name}" deleted by ${deletedBy}`,
        deletedBy
      );
      
      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
  
  // ==================== FORM GENERATION ====================
  
  /**
   * Generate a form from template and send to candidate
   */
  async generateForm(data) {
    try {
      const {
        templateId,
        candidateEmail,
        candidateName,
        caseId,
        senderEmail
      } = data;
      
      console.log('generateForm - Template ID:', templateId); // Debug log
      
      // Get template
      const template = await this.getTemplateById(templateId);
      if (!template || !template.is_active) {
        throw new Error('Template not found or inactive');
      }
      
      console.log('Using template:', template.name, 'with', template.fields?.length, 'fields');
      
      // Generate unique token
      const token = this.generateFormToken();
      
      // Create form record with template fields
      await database.createFormTemplate({
        token,
        templateId,
        caseId,
        candidateEmail,
        candidateName: candidateName || candidateEmail.split('@')[0],
        senderEmail,
        fields: template.fields // Use the template's fields
      });
      
      // Update template usage count
      await database.run(
        'UPDATE form_templates SET usage_count = usage_count + 1 WHERE id = ?',
        [templateId]
      );
      
      // Log activity
      await database.logActivity(
        caseId,
        token,
        'form_generated',
        `Form generated for ${candidateEmail} using template "${template.name}"`,
        senderEmail
      );
      
      return {
        success: true,
        token,
        formUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate-form/${token}`,
        template: template.name
      };
    } catch (error) {
      console.error('Error generating form:', error);
      throw error;
    }
  }
  
  /**
   * Send form to candidate (prepare mailto link)
   */
// recruitment-backend/services/formTemplateService.js - Replace the sendForm method

  /**
   * Send form to candidate (prepare mailto link)
   */
// recruitment-backend/services/formTemplateService.js - Replace the sendForm method

async sendForm(data) {
  try {
    const {
      templateId,
      candidateEmail,
      candidateName,
      caseId,
      senderEmail,
      senderName
    } = data;
    
    console.log('sendForm - Received template ID:', templateId);
    
    // Get template - ensure we parse the fields correctly
    const template = await database.get(
      'SELECT * FROM form_templates WHERE id = ? AND is_active = 1',
      [templateId]
    );
    
    if (!template) {
      throw new Error('Template not found or inactive');
    }
    
    // Parse template fields
    let templateFields;
    try {
      templateFields = typeof template.fields === 'string' 
        ? JSON.parse(template.fields) 
        : template.fields;
    } catch (e) {
      console.error('Error parsing template fields:', e);
      // Fall back to default if parsing fails
      const defaultTemplate = await database.get(
        'SELECT fields FROM form_templates WHERE is_default = 1'
      );
      templateFields = JSON.parse(defaultTemplate.fields);
    }
    
    console.log('Using template:', template.name, 'with fields:', templateFields.length);
    
    // Generate unique token
    const token = this.generateFormToken();
    
    // Create form record with the template's fields
    await database.createForm({
      token,
      templateId: template.id, // Make sure we're using the right template ID
      caseId,
      candidateEmail,
      candidateName: candidateName || candidateEmail.split('@')[0],
      senderEmail,
      fields: templateFields // Store the actual template fields
    });
    
    // Update template usage count
    await database.run(
      'UPDATE form_templates SET usage_count = usage_count + 1 WHERE id = ?',
      [template.id]
    );
    
    // Prepare email
    const emailService = require('./emailService');
    const emailData = await emailService.prepareFormEmail({
      token,
      candidateEmail,
      candidateName,
      senderEmail,
      senderName,
      templateName: template.name
    });
    
    // Log activity
    await database.logActivity(
      caseId,
      token,
      'form_prepared',
      `Form prepared for ${candidateEmail} using template "${template.name}"`,
      senderEmail
    );
    
    return {
      success: true,
      token,
      formUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate-form/${token}`,
      mailtoLink: emailData.mailtoLink,
      emailContent: emailData.emailContent,
      template: template.name
    };
  } catch (error) {
    console.error('Error sending form:', error);
    throw error;
  }
}
  /**
   * Get form by token (for candidate to view)
   */
  async getFormByToken(token) {
    try {
      const form = await database.getFormByToken(token);
      
      if (!form) {
        throw new Error('Form not found');
      }
      
      // Check if form is expired
      if (new Date(form.expires_at) < new Date()) {
        throw new Error('Form has expired');
      }
      
      // Check if already completed
      if (form.status === 'completed') {
        throw new Error('Form has already been submitted');
      }
      
      // Mark as opened if first time
      if (form.status === 'created' || form.status === 'sent') {
        await database.updateFormStatus(token, 'opened');
        
        // Log activity
        await database.logActivity(
          form.case_id,
          token,
          'form_opened',
          `Form opened by candidate`,
          form.candidate_email
        );
      }
      
      // Return the form with its fields
      return {
        token: form.token,
        fields: form.fields, // These should be the template's fields
        candidateEmail: form.candidate_email,
        candidateName: form.candidate_name,
        expiresAt: form.expires_at
      };
    } catch (error) {
      console.error('Error getting form:', error);
      throw error;
    }
  }
  
  // ==================== VALIDATION ====================
  
  /**
   * Validate template structure
   */
  validateTemplate(templateData) {
    if (!templateData.fields || !Array.isArray(templateData.fields)) {
      throw new Error('Template must have fields array');
    }
    
    if (templateData.fields.length === 0) {
      throw new Error('Template must have at least one field');
    }
    
    // Validate each field
    templateData.fields.forEach((field, index) => {
      if (!field.id) {
        throw new Error(`Field at index ${index} must have an id`);
      }
      
      if (!field.label) {
        throw new Error(`Field at index ${index} must have a label`);
      }
      
      if (!field.type) {
        throw new Error(`Field at index ${index} must have a type`);
      }
      
      // Validate field types
      const validTypes = ['text', 'email', 'tel', 'url', 'textarea', 'select', 
                         'radio', 'checkbox', 'date', 'file', 'number'];
      if (!validTypes.includes(field.type)) {
        throw new Error(`Invalid field type: ${field.type}`);
      }
      
      // Validate select/radio/checkbox fields have options
      if (['select', 'radio', 'checkbox'].includes(field.type) && !field.options) {
        throw new Error(`Field ${field.label} must have options`);
      }
    });
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * Generate unique form token
   */
  generateFormToken() {
    return crypto.randomBytes(16).toString('hex') + Date.now().toString(36);
  }
  
  /**
   * Get field library for form designer
   */
  async getFieldLibrary() {
    try {
      const fields = await database.all('SELECT * FROM field_library ORDER BY field_name');
      return fields.map(field => ({
        ...field,
        field_options: field.field_options ? JSON.parse(field.field_options) : null,
        validation_rules: field.validation_rules ? JSON.parse(field.validation_rules) : null
      }));
    } catch (error) {
      console.error('Error fetching field library:', error);
      return [];
    }
  }
  
  /**
   * Add field to library
   */
  async addFieldToLibrary(fieldData, createdBy) {
    try {
      const query = `
        INSERT INTO field_library 
        (field_name, field_type, field_label, field_options, validation_rules, 
         placeholder, help_text, is_required, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await database.run(query, [
        fieldData.name,
        fieldData.type,
        fieldData.label,
        fieldData.options ? JSON.stringify(fieldData.options) : null,
        fieldData.validationRules ? JSON.stringify(fieldData.validationRules) : null,
        fieldData.placeholder || null,
        fieldData.helpText || null,
        fieldData.required ? 1 : 0,
        createdBy
      ]);
      
      return {
        success: true,
        fieldId: result.id,
        message: 'Field added to library'
      };
    } catch (error) {
      console.error('Error adding field to library:', error);
      throw error;
    }
  }
}

module.exports = new FormTemplateService();
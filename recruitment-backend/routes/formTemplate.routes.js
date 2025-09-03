// recruitment-backend/routes/formTemplate.routes.js
const express = require('express');
const router = express.Router();
const formTemplateService = require('../services/formTemplateService');

// ==================== TEMPLATE MANAGEMENT ROUTES ====================

/**
 * GET /api/templates
 * Get all form templates
 */
router.get('/', async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const templates = await formTemplateService.getTemplates(!includeInactive);
    
    res.json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/templates/:id
 * Get single template by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await formTemplateService.getTemplateById(id);
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(error.message === 'Template not found' ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to fetch template'
    });
  }
});

/**
 * POST /api/templates
 * Create new form template
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    
    // Get user email from auth header or session
    const userEmail = req.headers['x-user-email'] || 'system';
    
    if (!name || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Name and fields are required'
      });
    }
    
    const result = await formTemplateService.createTemplate(
      { name, description, fields },
      userEmail
    );
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create template'
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update existing template
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    const result = await formTemplateService.updateTemplate(id, updates, userEmail);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(error.message === 'Template not found' ? 404 : 400).json({
      success: false,
      error: error.message || 'Failed to update template'
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete template (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    const result = await formTemplateService.deleteTemplate(id, userEmail);
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(error.message === 'Template not found' ? 404 : 400).json({
      success: false,
      error: error.message || 'Failed to delete template'
    });
  }
});

// ==================== FORM SENDING ROUTES ====================

/**
 * POST /api/templates/send-form
 * Send form to candidate (generates mailto link)
 */
router.post('/send-form', async (req, res) => {
  try {
    const {
      templateId,
      candidateEmail,
      candidateName,
      caseId,
      senderEmail,
      senderName
    } = req.body;
    
    // Validate required fields
    if (!templateId || !candidateEmail) {
      return res.status(400).json({
        success: false,
        error: 'Template ID and candidate email are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    const result = await formTemplateService.sendForm({
      templateId,
      candidateEmail,
      candidateName,
      caseId,
      senderEmail: senderEmail || req.headers['x-user-email'] || 'system',
      senderName
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error sending form:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send form'
    });
  }
});

/**
 * GET /api/templates/form/:token
 * Get form by token (for candidates - public endpoint)
 */
router.get('/form/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token || token.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form token'
      });
    }
    
    const form = await formTemplateService.getFormByToken(token);
    
    res.json({
      success: true,
      form
    });
  } catch (error) {
    console.error('Error fetching form:', error);
    
    // Send appropriate status codes for different errors
    let statusCode = 500;
    if (error.message === 'Form not found') statusCode = 404;
    if (error.message === 'Form has expired') statusCode = 410;
    if (error.message === 'Form has already been submitted') statusCode = 409;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch form'
    });
  }
});

// ==================== FIELD LIBRARY ROUTES ====================

/**
 * GET /api/templates/fields/library
 * Get field library for form designer
 */
router.get('/fields/library', async (req, res) => {
  try {
    const fields = await formTemplateService.getFieldLibrary();
    
    res.json({
      success: true,
      count: fields.length,
      fields
    });
  } catch (error) {
    console.error('Error fetching field library:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch field library'
    });
  }
});

/**
 * POST /api/templates/fields/library
 * Add field to library
 */
router.post('/fields/library', async (req, res) => {
  try {
    const fieldData = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    if (!fieldData.name || !fieldData.type || !fieldData.label) {
      return res.status(400).json({
        success: false,
        error: 'Field name, type, and label are required'
      });
    }
    
    const result = await formTemplateService.addFieldToLibrary(fieldData, userEmail);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding field to library:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to add field to library'
    });
  }
});

// ==================== UTILITY ROUTES ====================

/**
 * POST /api/templates/:id/duplicate
 * Duplicate an existing template
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    // Get original template
    const original = await formTemplateService.getTemplateById(id);
    
    // Create new template with modified name
    const result = await formTemplateService.createTemplate(
      {
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        fields: original.fields
      },
      userEmail
    );
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(error.message === 'Template not found' ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to duplicate template'
    });
  }
});

/**
 * GET /api/templates/:id/preview
 * Get template preview data
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await formTemplateService.getTemplateById(id);
    
    // Generate preview with sample data
    const preview = {
      template: template.name,
      description: template.description,
      fieldCount: template.fields.length,
      requiredFields: template.fields.filter(f => f.required).length,
      estimatedTime: Math.ceil(template.fields.length * 0.5) + ' minutes',
      fields: template.fields.map(f => ({
        label: f.label,
        type: f.type,
        required: f.required
      }))
    };
    
    res.json({
      success: true,
      preview
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(error.message === 'Template not found' ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to generate preview'
    });
  }
});

module.exports = router;
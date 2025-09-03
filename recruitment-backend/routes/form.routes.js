// recruitment-backend/routes/form.routes.js - SIMPLIFIED VERSION
const express = require('express');
const router = express.Router();
const database = require('../utils/database');

// ==================== LEGACY FORM ROUTES ====================
// These routes are kept for backward compatibility with existing frontend
// New implementations should use /api/templates and /api/responses

/**
 * GET /api/forms/:token
 * Get form by token (for candidates to fill)
 * Redirects to new template service
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const formTemplateService = require('../services/formTemplateService');
    
    const form = await formTemplateService.getFormByToken(token);
    
    res.json({
      success: true,
      form
    });
  } catch (error) {
    console.error('Error getting form:', error);
    
    let statusCode = 500;
    if (error.message === 'Form not found') statusCode = 404;
    if (error.message === 'Form has expired') statusCode = 410;
    if (error.message === 'Form has already been submitted') statusCode = 409;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve form'
    });
  }
});

/**
 * POST /api/forms/:token/submit
 * Submit form (by candidate)
 * Redirects to new response service
 */
router.post('/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { responses } = req.body;
    const responseService = require('../services/responseService');
    
    // Get metadata
    const metadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };
    
    const result = await responseService.submitResponse({
      token,
      responses,
      metadata
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error submitting form:', error);
    
    let statusCode = 500;
    if (error.message.includes('Invalid form token')) statusCode = 404;
    if (error.message.includes('already been submitted')) statusCode = 409;
    if (error.message.includes('expired')) statusCode = 410;
    if (error.message.includes('Validation failed')) statusCode = 400;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to submit form'
    });
  }
});

/**
 * GET /api/forms/:token/status
 * Get form status
 */
router.get('/:token/status', async (req, res) => {
  try {
    const { token } = req.params;
    const form = await database.getFormByToken(token);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    res.json({
      success: true,
      status: {
        formStatus: form.status,
        sentDate: form.sent_date,
        openedDate: form.opened_date,
        completedDate: form.completed_date,
        hasResponses: !!form.response_data,
        expiresAt: form.expires_at
      }
    });
  } catch (error) {
    console.error('Error getting form status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get form status'
    });
  }
});

/**
 * GET /api/forms/case/:caseId
 * Get all forms for a case
 */
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const forms = await database.all(
      'SELECT * FROM forms WHERE case_id = ? ORDER BY created_date DESC',
      [caseId]
    );
    
    res.json({
      success: true,
      forms: forms.map(form => ({
        token: form.token,
        status: form.status,
        candidateEmail: form.candidate_email,
        candidateName: form.candidate_name,
        sentDate: form.sent_date,
        openedDate: form.opened_date,
        completedDate: form.completed_date,
        hasResponses: !!form.response_data
      }))
    });
  } catch (error) {
    console.error('Error getting case forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get case forms'
    });
  }
});

/**
 * POST /api/forms/send
 * Legacy endpoint - redirects to new template service
 */
router.post('/send', async (req, res) => {
  try {
    const {
      templateId,
      caseId,
      candidateEmail,
      candidateName,
      senderEmail,
      senderName
    } = req.body;
    
    const formTemplateService = require('../services/formTemplateService');
    
    // Use default template if not specified
    let useTemplateId = templateId;
    if (!useTemplateId) {
      // Get default template
      const templates = await database.all(
        'SELECT id FROM form_templates WHERE is_default = 1 LIMIT 1'
      );
      if (templates.length > 0) {
        useTemplateId = templates[0].id;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No default template found'
        });
      }
    }
    
    // Use new service to send form
    const result = await formTemplateService.sendForm({
      templateId: useTemplateId,
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
 * GET /api/forms/:token/responses
 * Get form responses
 */
router.get('/:token/responses', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Get response from candidate_responses table
    const response = await database.get(
      'SELECT * FROM candidate_responses WHERE form_token = ?',
      [token]
    );
    
    if (!response) {
      // Fallback to old forms table
      const form = await database.getFormByToken(token);
      if (!form || !form.response_data) {
        return res.status(404).json({
          success: false,
          error: 'No responses found'
        });
      }
      
      return res.json({
        success: true,
        responses: form.response_data,
        submittedAt: form.completed_date
      });
    }
    
    res.json({
      success: true,
      responses: JSON.parse(response.response_data),
      submittedAt: response.submitted_at
    });
  } catch (error) {
    console.error('Error getting form responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get form responses'
    });
  }
});

/**
 * GET /api/forms/pending/all
 * Get all pending forms
 */
router.get('/pending/all', async (req, res) => {
  try {
    const forms = await database.all(`
      SELECT f.*, cr.id as response_id
      FROM forms f
      LEFT JOIN candidate_responses cr ON f.token = cr.form_token
      WHERE f.status IN ('created', 'sent', 'opened')
      AND (f.expires_at IS NULL OR f.expires_at > datetime('now'))
      ORDER BY f.created_date DESC
    `);
    
    res.json({
      success: true,
      count: forms.length,
      forms: forms.map(form => ({
        token: form.token,
        caseId: form.case_id,
        candidateEmail: form.candidate_email,
        candidateName: form.candidate_name,
        status: form.status,
        sentDate: form.sent_date,
        hasResponse: !!form.response_id,
        daysSinceSent: form.sent_date 
          ? Math.floor((Date.now() - new Date(form.sent_date)) / (1000 * 60 * 60 * 24))
          : null,
        expiresIn: form.expires_at
          ? Math.floor((new Date(form.expires_at) - Date.now()) / (1000 * 60 * 60 * 24))
          : null
      }))
    });
  } catch (error) {
    console.error('Error getting pending forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending forms'
    });
  }
});

/**
 * POST /api/forms/:token/resend
 * Resend form email (generates new mailto link)
 */
router.post('/:token/resend', async (req, res) => {
  try {
    const { token } = req.params;
    const form = await database.getFormByToken(token);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    if (form.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Form has already been completed'
      });
    }
    
    // Generate new mailto link
    const emailService = require('../services/emailService');
    const emailData = await emailService.prepareFormEmail({
      token: form.token,
      candidateEmail: form.candidate_email,
      candidateName: form.candidate_name,
      senderEmail: form.sender_email,
      senderName: req.body.senderName || 'Recruitment Team'
    });
    
    // Log activity
    await database.logActivity(
      form.case_id,
      token,
      'form_resent',
      `Form resent to ${form.candidate_email}`,
      form.sender_email
    );
    
    res.json({
      success: true,
      message: 'Form link regenerated successfully',
      mailtoLink: emailData.mailtoLink,
      emailContent: emailData.emailContent
    });
  } catch (error) {
    console.error('Error resending form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend form'
    });
  }
});

/**
 * DELETE /api/forms/:token
 * Cancel/delete a form
 */
router.delete('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    const form = await database.getFormByToken(token);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    if (form.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete completed form'
      });
    }
    
    // Mark form as cancelled
    await database.updateFormStatus(token, 'cancelled');
    
    // Log activity
    await database.logActivity(
      form.case_id,
      token,
      'form_cancelled',
      `Form cancelled by ${userEmail}`,
      userEmail
    );
    
    res.json({
      success: true,
      message: 'Form cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel form'
    });
  }
});

module.exports = router;
// recruitment-backend/routes/form.routes.js
const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const emailService = require('../services/emailService');
const pollingService = require('../services/pollingService');

// ==================== FORM CREATION & SENDING ====================

// Create and send form to candidate
router.post('/send', async (req, res) => {
  try {
    const {
      caseId,
      candidateEmail,
      candidateName,
      senderEmail,
      fields
    } = req.body;
    
    // Validate required fields
    if (!candidateEmail || !senderEmail || !caseId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Generate unique token
    const token = generateToken();
    
    // Create form data
    const formData = {
      token,
      caseId,
      candidateEmail,
      candidateName: candidateName || candidateEmail.split('@')[0],
      senderEmail,
      fields: fields || getDefaultFields()
    };
    
    // Save form to database
    await database.createForm(formData);
    
    // Send email
    const emailResult = await emailService.sendFormEmail(formData);
    
    // Update form status to 'sent'
    await database.updateFormStatus(token, 'sent', {
      email_message_id: emailResult.messageId
    });
    
    res.json({
      success: true,
      token,
      message: 'Form sent successfully',
      emailProvider: emailResult.provider
    });
    
  } catch (error) {
    console.error('Error sending form:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send form'
    });
  }
});

// ==================== FORM RETRIEVAL ====================

// Get form by token (for candidates to fill)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const form = await database.getFormByToken(token);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found or expired'
      });
    }
    
    if (form.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Form has already been submitted'
      });
    }
    
    // Mark form as opened if it was just sent
    if (form.status === 'sent') {
      await database.updateFormStatus(token, 'opened');
      await database.logActivity(
        form.case_id,
        token,
        'form_opened',
        `Form opened by candidate`,
        form.candidate_email
      );
    }
    
    res.json({
      success: true,
      form: {
        token: form.token,
        fields: form.fields,
        candidateEmail: form.candidate_email,
        candidateName: form.candidate_name,
        caseId: form.case_id
      }
    });
    
  } catch (error) {
    console.error('Error getting form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve form'
    });
  }
});

// ==================== FORM SUBMISSION ====================

// Submit form (by candidate)
router.post('/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { responses } = req.body;
    
    if (!responses) {
      return res.status(400).json({
        success: false,
        error: 'No form data provided'
      });
    }
    
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
        error: 'Form has already been submitted'
      });
    }
    
    // Validate responses against required fields
    const validationErrors = validateFormResponses(form.fields, responses);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Update form status
    await database.updateFormStatus(token, 'completed', {
      response_data: responses
    });
    
    // Log activity
    await database.logActivity(
      form.case_id,
      token,
      'form_completed',
      `Form submitted by candidate`,
      form.candidate_email
    );
    
    res.json({
      success: true,
      message: 'Form submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit form'
    });
  }
});

// ==================== FORM STATUS & TRACKING ====================

// Get form status by token
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
    
    // Get email tracking info
    const emailStatus = await emailService.checkEmailStatus(token);
    
    res.json({
      success: true,
      status: {
        formStatus: form.status,
        emailStatus: emailStatus.status,
        sentDate: form.sent_date,
        openedDate: form.opened_date,
        completedDate: form.completed_date,
        hasResponses: !!form.response_data
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

// Get all forms for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const forms = await database.getFormsByCaseId(caseId);
    
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

// ==================== FORM RESPONSES ====================

// Get form responses
router.get('/:token/responses', async (req, res) => {
  try {
    const { token } = req.params;
    
    const form = await database.getFormByToken(token);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    if (!form.response_data) {
      return res.status(404).json({
        success: false,
        error: 'No responses found'
      });
    }
    
    res.json({
      success: true,
      responses: form.response_data,
      submittedAt: form.completed_date
    });
    
  } catch (error) {
    console.error('Error getting form responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get form responses'
    });
  }
});

// ==================== RESEND FORM ====================

// Resend form email
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
    
    // Resend email
    const formData = {
      token: form.token,
      caseId: form.case_id,
      candidateEmail: form.candidate_email,
      candidateName: form.candidate_name,
      senderEmail: form.sender_email,
      fields: form.fields
    };
    
    const emailResult = await emailService.sendFormEmail(formData);
    
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
      message: 'Form resent successfully'
    });
    
  } catch (error) {
    console.error('Error resending form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend form'
    });
  }
});

// ==================== POLLING & CHECKING ====================

// Manually check for email responses
router.post('/check-responses/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const result = await pollingService.manualCheck(caseId);
    
    res.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Error checking responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for responses'
    });
  }
});

// ==================== BULK OPERATIONS ====================

// Get all pending forms
router.get('/pending/all', async (req, res) => {
  try {
    const forms = await database.getPendingForms();
    
    res.json({
      success: true,
      count: forms.length,
      forms: forms.map(form => ({
        token: form.token,
        caseId: form.case_id,
        candidateEmail: form.candidate_email,
        status: form.status,
        sentDate: form.sent_date,
        daysSinceSent: form.sent_date 
          ? Math.floor((Date.now() - new Date(form.sent_date)) / (1000 * 60 * 60 * 24))
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

// ==================== HELPER FUNCTIONS ====================

function generateToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

function getDefaultFields() {
  return [
    { id: 'name', label: 'Full Name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'phone', label: 'Phone', type: 'tel', required: true },
    { id: 'linkedIn', label: 'LinkedIn Profile', type: 'url', required: false },
    { id: 'location', label: 'Current Location', type: 'text', required: true },
    { id: 'visa', label: 'Visa Status', type: 'select', required: true,
      options: ['H1B', 'OPT-EAD', 'GC-EAD', 'Green Card', 'US Citizen'] },
    { id: 'experience', label: 'Years of Experience', type: 'select', required: true,
      options: ['0-2 years', '2-5 years', '5-8 years', '8-10 years', '10+ years'] },
    { id: 'skills', label: 'Technical Skills', type: 'textarea', required: true },
    { id: 'education', label: 'Highest Education', type: 'select', required: true,
      options: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD'] },
    { id: 'availability', label: 'Availability', type: 'select', required: true,
      options: ['Immediate', '2 weeks', '1 month', 'More than 1 month'] }
  ];
}

function validateFormResponses(fields, responses) {
  const errors = [];
  
  for (const field of fields) {
    if (field.required && !responses[field.id]) {
      errors.push({
        field: field.id,
        message: `${field.label} is required`
      });
    }
    
    // Email validation
    if (field.type === 'email' && responses[field.id]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(responses[field.id])) {
        errors.push({
          field: field.id,
          message: `Invalid email format`
        });
      }
    }
    
    // URL validation
    if (field.type === 'url' && responses[field.id]) {
      try {
        new URL(responses[field.id]);
      } catch {
        errors.push({
          field: field.id,
          message: `Invalid URL format`
        });
      }
    }
  }
  
  return errors;
}

module.exports = router;
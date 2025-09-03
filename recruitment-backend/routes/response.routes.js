// recruitment-backend/routes/response.routes.js
const express = require('express');
const router = express.Router();
const responseService = require('../services/responseService');
const database = require('../utils/database');

// ==================== PUBLIC ROUTES (for candidates) ====================

/**
 * POST /api/responses/submit
 * Submit form response (PUBLIC - no auth required)
 */
router.post('/submit', async (req, res) => {
  try {
    const { token, responses } = req.body;
    
    // Validate input
    if (!token || !responses) {
      return res.status(400).json({
        success: false,
        error: 'Token and responses are required'
      });
    }
    
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
    console.error('Error submitting response:', error);
    
    let statusCode = 500;
    if (error.message.includes('Invalid form token')) statusCode = 404;
    if (error.message.includes('already been submitted')) statusCode = 409;
    if (error.message.includes('expired')) statusCode = 410;
    if (error.message.includes('Validation failed')) statusCode = 400;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to submit response'
    });
  }
});

/**
 * GET /api/responses/form/:token
 * Get form for submission (PUBLIC - no auth required)
 * Same as /api/templates/form/:token but through responses route
 */
router.get('/form/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const formTemplateService = require('../services/formTemplateService');
    
    const form = await formTemplateService.getFormByToken(token);
    
    res.json({
      success: true,
      form
    });
  } catch (error) {
    console.error('Error fetching form:', error);
    
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

// ==================== PROTECTED ROUTES (for BSM users) ====================

/**
 * GET /api/responses
 * Get all responses (with filters)
 */
router.get('/', async (req, res) => {
  try {
    const { processed, caseCreated, limit, offset } = req.query;
    
    const filters = {};
    if (processed !== undefined) filters.processed = processed === 'true';
    if (caseCreated !== undefined) filters.caseCreated = caseCreated === 'true';
    
    const responses = await responseService.getResponses(filters);
    
    // Apply pagination if requested
    let paginatedResponses = responses;
    if (limit) {
      const startIndex = parseInt(offset) || 0;
      const endIndex = startIndex + parseInt(limit);
      paginatedResponses = responses.slice(startIndex, endIndex);
    }
    
    res.json({
      success: true,
      count: paginatedResponses.length,
      total: responses.length,
      responses: paginatedResponses
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch responses'
    });
  }
});

/**
 * GET /api/responses/stats
 * Get response statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await responseService.getResponseStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/responses/:id
 * Get single response by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await responseService.getResponseById(id);
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('Error fetching response:', error);
    res.status(error.message === 'Response not found' ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to fetch response'
    });
  }
});

/**
 * POST /api/responses/:id/process
 * Mark response as processed
 */
router.post('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    const result = await responseService.markAsProcessed(id, userEmail);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing response:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process response'
    });
  }
});

/**
 * POST /api/responses/:id/create-candidate
 * Create candidate from response
 */
router.post('/:id/create-candidate', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'] || 'system';
    const additionalData = req.body;
    
    const result = await responseService.createCandidateFromResponse(id, userEmail);
    
    // If additional data provided, use it to enhance the candidate profile
    if (additionalData && Object.keys(additionalData).length > 0) {
      // This would integrate with your case management system
      // For now, we'll just log it
      await database.logActivity(
        result.caseId,
        null,
        'candidate_enhanced',
        'Additional data added to candidate profile',
        userEmail
      );
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error creating candidate:', error);
    
    let statusCode = 500;
    if (error.message === 'Response not found') statusCode = 404;
    if (error.message.includes('already created')) statusCode = 409;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create candidate'
    });
  }
});

/**
 * DELETE /api/responses/:id
 * Delete a response (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    // Soft delete - just mark as deleted
    await database.run(
      'UPDATE candidate_responses SET deleted = 1, deleted_by = ?, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userEmail, id]
    );
    
    await database.logActivity(
      null,
      null,
      'response_deleted',
      `Response ${id} deleted by ${userEmail}`,
      userEmail
    );
    
    res.json({
      success: true,
      message: 'Response deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete response'
    });
  }
});

// ==================== BULK OPERATIONS ====================

/**
 * POST /api/responses/bulk/process
 * Mark multiple responses as processed
 */
router.post('/bulk/process', async (req, res) => {
  try {
    const { responseIds } = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    if (!responseIds || !Array.isArray(responseIds) || responseIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Response IDs array is required'
      });
    }
    
    const results = await Promise.all(
      responseIds.map(id => responseService.markAsProcessed(id, userEmail))
    );
    
    res.json({
      success: true,
      message: `${results.length} responses marked as processed`,
      results
    });
  } catch (error) {
    console.error('Error bulk processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process responses'
    });
  }
});

// ==================== EXPORT ROUTES ====================

/**
 * GET /api/responses/export/csv
 * Export responses as CSV
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { startDate, endDate, processed } = req.query;
    
    const filters = {};
    if (processed !== undefined) filters.processed = processed === 'true';
    
    const responses = await responseService.getResponses(filters);
    
    // Filter by date if provided
    let filteredResponses = responses;
    if (startDate || endDate) {
      filteredResponses = responses.filter(r => {
        const submittedDate = new Date(r.submitted_at);
        if (startDate && submittedDate < new Date(startDate)) return false;
        if (endDate && submittedDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Convert to CSV format
    const csv = convertToCSV(filteredResponses);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV'
    });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

/**
 * GET /api/responses/:id/resend-notification
 * Resend notification for a response
 */
router.post('/:id/resend-notification', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get response details
    const response = await responseService.getResponseById(id);
    
    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'Response not found'
      });
    }
    
    // Send notification
    const emailService = require('../services/emailService');
    await emailService.sendResponseNotification({
      bsmEmail: response.form.senderEmail,
      candidateName: response.candidate_name,
      candidateEmail: response.candidate_email,
      responseId: id
    });
    
    res.json({
      success: true,
      message: 'Notification resent successfully'
    });
  } catch (error) {
    console.error('Error resending notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend notification'
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

function convertToCSV(responses) {
  if (responses.length === 0) return '';
  
  // Get all unique field names from all responses
  const allFields = new Set();
  responses.forEach(r => {
    Object.keys(r.response_data).forEach(key => allFields.add(key));
  });
  
  // Create header row
  const headers = ['ID', 'Submitted At', 'Email', 'Name', 'Processed', 'Case Created', ...Array.from(allFields)];
  const csv = [headers.join(',')];
  
  // Add data rows
  responses.forEach(r => {
    const row = [
      r.id,
      r.submitted_at,
      r.candidate_email,
      r.candidate_name,
      r.processed ? 'Yes' : 'No',
      r.case_created ? 'Yes' : 'No'
    ];
    
    // Add response data fields
    Array.from(allFields).forEach(field => {
      const value = r.response_data[field] || '';
      // Escape quotes and wrap in quotes if contains comma
      const escapedValue = value.toString().replace(/"/g, '""');
      row.push(escapedValue.includes(',') ? `"${escapedValue}"` : escapedValue);
    });
    
    csv.push(row.join(','));
  });
  
  return csv.join('\n');
}

module.exports = router;
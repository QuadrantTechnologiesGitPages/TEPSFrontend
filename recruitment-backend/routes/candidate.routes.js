// recruitment-backend/routes/candidate.routes.js - NEW FILE
const express = require('express');
const router = express.Router();
const candidateService = require('../services/candidateService');

// ==================== CANDIDATE ROUTES ====================

/**
 * GET /api/candidates
 * Get all candidates with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, visa_status, search, limit, offset } = req.query;
    
    const filters = {
      status,
      visa_status,
      search,
      limit: limit ? parseInt(limit) : 50
    };
    
    const candidates = await candidateService.getCandidates(filters);
    
    res.json({
      success: true,
      count: candidates.length,
      candidates
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch candidates'
    });
  }
});

/**
 * GET /api/candidates/stats
 * Get candidate statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await candidateService.getCandidateStats();
    
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
 * GET /api/candidates/:id
 * Get single candidate by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await candidateService.getCandidateById(id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }
    
    res.json({
      success: true,
      candidate
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch candidate'
    });
  }
});

/**
 * GET /api/candidates/:id/activities
 * Get candidate activity history
 */
router.get('/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const activities = await candidateService.getCandidateActivities(id);
    
    res.json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities'
    });
  }
});

/**
 * POST /api/candidates
 * Create new candidate manually
 */
router.post('/', async (req, res) => {
  try {
    const candidateData = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    // Validate required fields
    if (!candidateData.name || !candidateData.email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateData.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    const result = await candidateService.createCandidate(candidateData, userEmail);
    
    res.status(201).json({
      success: true,
      message: 'Candidate created successfully',
      candidateId: result.candidateId,
      candidate: result.candidate
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create candidate'
    });
  }
});

/**
 * POST /api/candidates/from-response
 * Create candidate from form response
 */
router.post('/from-response', async (req, res) => {
  try {
    const { responseId } = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    if (!responseId) {
      return res.status(400).json({
        success: false,
        error: 'Response ID is required'
      });
    }
    
    const result = await candidateService.createCandidateFromResponse(
      responseId,
      userEmail
    );
    
    res.status(201).json({
      success: true,
      message: 'Candidate created from response',
      candidateId: result.candidateId,
      candidate: result.candidate
    });
  } catch (error) {
    console.error('Error creating candidate from response:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create candidate'
    });
  }
});

/**
 * PUT /api/candidates/:id
 * Update candidate
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;
    
    const result = await candidateService.updateCandidate(id, updates, userEmail);
    
    res.json({
      success: true,
      message: 'Candidate updated successfully',
      candidate: result.candidate
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    
    if (error.message === 'Candidate not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update candidate'
    });
  }
});

/**
 * PUT /api/candidates/:id/status
 * Update candidate status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    const validStatuses = ['Active', 'Inactive', 'Placed', 'On Hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const result = await candidateService.updateCandidateStatus(
      id,
      status,
      reason,
      userEmail
    );
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      candidate: result.candidate
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update status'
    });
  }
});

/**
 * POST /api/candidates/:id/notes
 * Add note to candidate
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
    }
    
    const result = await candidateService.addNote(id, note, userEmail);
    
    res.json({
      success: true,
      message: 'Note added successfully',
      candidate: result.candidate
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to add note'
    });
  }
});

/**
 * DELETE /api/candidates/:id
 * Soft delete candidate (set as inactive)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    const result = await candidateService.deactivateCandidate(id, userEmail);
    
    res.json({
      success: true,
      message: 'Candidate deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating candidate:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to deactivate candidate'
    });
  }
});

/**
 * GET /api/candidates/export/csv
 * Export candidates to CSV
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { status, visa_status } = req.query;
    const filters = { status, visa_status };
    
    const csv = await candidateService.exportToCSV(filters);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=candidates-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV'
    });
  }
});

/**
 * POST /api/candidates/bulk/update-status
 * Bulk update candidate status
 */
router.post('/bulk/update-status', async (req, res) => {
  try {
    const { candidateIds, status } = req.body;
    const userEmail = req.headers['x-user-email'] || 'system';
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Candidate IDs array is required'
      });
    }
    
    const validStatuses = ['Active', 'Inactive', 'Placed', 'On Hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const results = await candidateService.bulkUpdateStatus(
      candidateIds,
      status,
      userEmail
    );
    
    res.json({
      success: true,
      message: `${results.updated} candidates updated`,
      results
    });
  } catch (error) {
    console.error('Error bulk updating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update candidates'
    });
  }
});

module.exports = router;
// recruitment-backend/routes/case.routes.js
const express = require('express');
const router = express.Router();
const caseService = require('../services/caseService');
const verificationService = require('../services/verificationService');
const candidateService = require('../services/candidateService');

/**
 * GET /api/cases
 * Get all cases with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, userId, dateFrom, dateTo } = req.query;
    
    const filters = {
      status,
      userId,
      dateFrom,
      dateTo
    };
    
    const cases = await caseService.getCases(filters);
    
    res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cases/daily-tasks
 * Get daily tasks for current user
 */
router.get('/daily-tasks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }
    
    const tasks = await caseService.getDailyTasks(userId);
    
    // Group tasks by priority
    const grouped = {
      overdue: tasks.filter(t => t.priority === 'overdue'),
      pending: tasks.filter(t => t.priority === 'pending'),
      normal: tasks.filter(t => t.priority === 'normal')
    };
    
    res.json({
      success: true,
      totalTasks: tasks.length,
      tasks: grouped,
      summary: {
        overdue: grouped.overdue.length,
        pending: grouped.pending.length,
        normal: grouped.normal.length
      }
    });
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cases/:id
 * Get single case details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const caseData = await caseService.getCaseById(id);
    
    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }
    
    res.json({
      success: true,
      case: caseData
    });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/cases/:id/trigger
 * Trigger status transition
 */
router.post('/:id/trigger', async (req, res) => {
  try {
    const { id } = req.params;
    const { trigger, data } = req.body;
    
    if (!trigger) {
      return res.status(400).json({
        success: false,
        error: 'Trigger action required'
      });
    }
    
    const result = await caseService.triggerStatusTransition(id, trigger, data);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error triggering transition:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/cases/:id/forward
 * Forward case to another user
 */
router.post('/:id/forward', async (req, res) => {
  try {
    const { id } = req.params;
    const { toUserId, notes } = req.body;
    const fromUserId = req.headers['x-user-id'];
    
    if (!toUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID required'
      });
    }
    
    const result = await caseService.forwardCase(id, toUserId, fromUserId, notes);
    
    res.json({
      success: true,
      message: `Case forwarded to user ${toUserId}`
    });
  } catch (error) {
    console.error('Error forwarding case:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/cases/:id/start-verification
 * Start phone verification session
 */
router.post('/:id/start-verification', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.body.userId;
    
    const session = await verificationService.startVerification(id, userId);
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error starting verification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/cases/verification/save
 * Save verification data
 */
router.post('/verification/save', async (req, res) => {
  try {
    const { sessionId, verificationData } = req.body;
    
    if (!sessionId || !verificationData) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and verification data required'
      });
    }
    
    const result = await verificationService.saveVerificationData(sessionId, verificationData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error saving verification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/cases/:id/create-candidate
 * Create candidate from case
 */
router.post('/:id/create-candidate', async (req, res) => {
  try {
    const { id } = req.params;
    const additionalData = req.body;
    const createdBy = req.headers['x-user-email'] || 'system';
    
    // Create candidate from case data
    const result = await candidateService.createCandidateFromCase(id, additionalData);
    
    res.json({
      success: true,
      message: 'Candidate created successfully',
      candidateId: result.candidateId,
      candidate: result.candidate,
      qualityScore: result.qualityScore,
      isGoldCandidate: result.isGoldCandidate
    });
  } catch (error) {
    console.error('Error creating candidate from case:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cases/stats/overview
 * Get case statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await caseService.getCaseStatistics();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cases/workflow/status-flow
 * Get workflow configuration
 */
router.get('/workflow/status-flow', async (req, res) => {
  res.json({
    success: true,
    workflow: caseService.statusFlow
  });
});

/**
 * GET /api/cases/verification/checklist
 * Get verification checklist template
 */
router.get('/verification/checklist', async (req, res) => {
  const checklist = verificationService.getVerificationChecklist();
  
  res.json({
    success: true,
    checklist
  });
});

/**
 * POST /api/cases/bulk/update-status
 * Bulk update case status
 */
router.post('/bulk/update-status', async (req, res) => {
  try {
    const { caseIds, trigger } = req.body;
    
    if (!caseIds || !Array.isArray(caseIds)) {
      return res.status(400).json({
        success: false,
        error: 'Case IDs array required'
      });
    }
    
    const results = [];
    for (const caseId of caseIds) {
      try {
        const result = await caseService.triggerStatusTransition(caseId, trigger);
        results.push({ caseId, ...result });
      } catch (error) {
        results.push({ caseId, success: false, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      summary: {
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error bulk updating:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
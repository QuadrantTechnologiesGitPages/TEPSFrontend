// recruitment-backend/routes/placement.routes.js
const express = require('express');
const router = express.Router();
const placementService = require('../services/placementService');

/**
 * POST /api/placements/submit-vendor
 * Submit candidate to vendor
 */
router.post('/submit-vendor', async (req, res) => {
  try {
    const submittedBy = req.headers['x-user-email'] || 'system';
    
    const submissionData = {
      ...req.body,
      submittedBy
    };

    const result = await placementService.submitToVendor(submissionData);
    
    res.status(result.success ? 201 : 400).json(result);

  } catch (error) {
    console.error('Error submitting to vendor:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit to vendor'
    });
  }
});

/**
 * POST /api/placements/submit-client
 * Submit candidate to client
 */
router.post('/submit-client', async (req, res) => {
  try {
    const submittedBy = req.headers['x-user-email'] || 'system';
    
    const submissionData = {
      ...req.body,
      submittedBy
    };

    const result = await placementService.submitToClient(submissionData);
    
    res.status(result.success ? 201 : 400).json(result);

  } catch (error) {
    console.error('Error submitting to client:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit to client'
    });
  }
});

/**
 * PUT /api/placements/update-status/:submissionId
 * Update submission status
 */
router.put('/update-status/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, type = 'vendor', notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const result = await placementService.updateSubmissionStatus(
      submissionId,
      status,
      type,
      notes
    );

    res.json(result);

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status'
    });
  }
});

/**
 * POST /api/placements/create-offer
 * Create offer for candidate
 */
router.post('/create-offer', async (req, res) => {
  try {
    const createdBy = req.headers['x-user-email'] || 'system';
    
    const offerData = {
      ...req.body,
      createdBy
    };

    const result = await placementService.createOffer(offerData);
    
    res.status(201).json(result);

  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create offer'
    });
  }
});

/**
 * POST /api/placements/respond-offer/:offerId
 * Respond to offer (accept/reject/negotiate)
 */
router.post('/respond-offer/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const respondedBy = req.headers['x-user-email'] || 'system';
    
    const details = {
      ...req.body,
      respondedBy
    };

    const result = await placementService.respondToOffer(offerId, req.body.action, details);
    
    res.json(result);

  } catch (error) {
    console.error('Error responding to offer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to respond to offer'
    });
  }
});

/**
 * GET /api/placements/pipeline/:candidateId
 * Get complete pipeline for a candidate
 */
router.get('/pipeline/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const pipeline = await placementService.getCandidatePipeline(candidateId);
    
    res.json({
      success: true,
      ...pipeline
    });

  } catch (error) {
    console.error('Error getting pipeline:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get candidate pipeline'
    });
  }
});

/**
 * GET /api/placements/active
 * Get all active placements
 */
router.get('/active', async (req, res) => {
  try {
    const filters = {
      clientId: req.query.clientId,
      vendorId: req.query.vendorId,
      startDate: req.query.startDate
    };

    const result = await placementService.getActivePlacements(filters);
    
    res.json(result);

  } catch (error) {
    console.error('Error getting placements:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get placements'
    });
  }
});

/**
 * GET /api/placements/metrics
 * Get placement metrics and analytics
 */
router.get('/metrics', async (req, res) => {
  try {
    const dateRange = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const metrics = await placementService.getPlacementMetrics(dateRange);
    
    res.json(metrics);

  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/placements/vendor-submissions
 * Get all vendor submissions with filters
 */
router.get('/vendor-submissions', async (req, res) => {
  try {
    const { status, vendorId, candidateId, requirementId } = req.query;
    
    let query = `
      SELECT 
        vs.*,
        c.name as candidate_name,
        v.company_name as vendor_name
      FROM vendor_submissions vs
      JOIN candidates c ON vs.candidate_id = c.id
      JOIN vendors v ON vs.vendor_id = v.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND vs.status = $${params.length}`;
    }
    
    if (vendorId) {
      params.push(vendorId);
      query += ` AND vs.vendor_id = $${params.length}`;
    }
    
    if (candidateId) {
      params.push(candidateId);
      query += ` AND vs.candidate_id = $${params.length}`;
    }
    
    if (requirementId) {
      params.push(requirementId);
      query += ` AND vs.requirement_id = $${params.length}`;
    }
    
    query += ' ORDER BY vs.submitted_at DESC';
    
    const db = require('../data/database');
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      submissions: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error getting vendor submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor submissions'
    });
  }
});

/**
 * GET /api/placements/client-submissions
 * Get all client submissions with filters
 */
router.get('/client-submissions', async (req, res) => {
  try {
    const { status, clientId, candidateId, requirementId } = req.query;
    
    let query = `
      SELECT 
        cs.*,
        c.name as candidate_name,
        cl.company_name as client_name
      FROM client_submissions cs
      JOIN candidates c ON cs.candidate_id = c.id
      JOIN clients cl ON cs.client_id = cl.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND cs.status = $${params.length}`;
    }
    
    if (clientId) {
      params.push(clientId);
      query += ` AND cs.client_id = $${params.length}`;
    }
    
    if (candidateId) {
      params.push(candidateId);
      query += ` AND cs.candidate_id = $${params.length}`;
    }
    
    if (requirementId) {
      params.push(requirementId);
      query += ` AND cs.requirement_id = $${params.length}`;
    }
    
    query += ' ORDER BY cs.submitted_at DESC';
    
    const db = require('../data/database');
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      submissions: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error getting client submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get client submissions'
    });
  }
});

module.exports = router;
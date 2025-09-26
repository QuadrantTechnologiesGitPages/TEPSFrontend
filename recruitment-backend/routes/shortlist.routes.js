// recruitment-backend/routes/shortlist.routes.js
const express = require('express');
const router = express.Router();
const shortlistService = require('../services/shortlistService');

/**
 * POST /api/shortlist/create-bucket
 * Create a new shortlist bucket
 */
router.post('/create-bucket', async (req, res) => {
  try {
    const {
      name,
      description,
      requirementId,
      jdText,
      clientName,
      expiryDays
    } = req.body;
    
    const createdBy = req.headers['x-user-email'] || 'system';
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Bucket name is required'
      });
    }
    
    const result = await shortlistService.createBucket(
      { name, description, requirementId, jdText, clientName, expiryDays },
      createdBy
    );
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Error creating bucket:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/shortlist/:bucketId/add-candidates
 * Add candidates to bucket
 */
router.post('/:bucketId/add-candidates', async (req, res) => {
  try {
    const { bucketId } = req.params;
    const { candidateIds, metadata } = req.body;
    const addedBy = req.headers['x-user-email'] || 'system';
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Candidate IDs array is required'
      });
    }
    
    const result = await shortlistService.addCandidatesToBucket(
      bucketId,
      candidateIds,
      addedBy,
      metadata
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error adding candidates:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/shortlist/:bucketId/add-from-search
 * Add candidates from search results
 */
router.post('/:bucketId/add-from-search', async (req, res) => {
  try {
    const { bucketId } = req.params;
    const { searchQuery, filters } = req.body;
    const addedBy = req.headers['x-user-email'] || 'system';
    
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const result = await shortlistService.addFromSearchResults(
      bucketId,
      searchQuery,
      filters,
      addedBy
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error adding from search:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/shortlist/buckets
 * Get user's buckets
 */
router.get('/buckets', async (req, res) => {
  try {
    const userId = req.headers['x-user-email'] || req.query.userId;
    const includeShared = req.query.includeShared !== 'false';
    
    const buckets = await shortlistService.getUserBuckets(userId, includeShared);
    
    res.json({
      success: true,
      count: buckets.length,
      buckets
    });
    
  } catch (error) {
    console.error('Error fetching buckets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/shortlist/:bucketId
 * Get bucket with candidates
 */
router.get('/:bucketId', async (req, res) => {
  try {
    const { bucketId } = req.params;
    const result = await shortlistService.getBucketWithCandidates(bucketId);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error fetching bucket:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/shortlist/:bucketId/bulk-action
 * Perform bulk action on bucket
 */
router.post('/:bucketId/bulk-action', async (req, res) => {
  try {
    const { bucketId } = req.params;
    const { action, params } = req.body;
    const performedBy = req.headers['x-user-email'] || 'system';
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }
    
    const validActions = [
      'send_to_recruiter',
      'schedule_interviews', 
      'submit_to_vendor',
      'export',
      'share',
      'merge'
    ];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }
    
    const result = await shortlistService.performBulkAction(
      bucketId,
      action,
      params || {},
      performedBy
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/shortlist/:bucketId/candidates/:candidateId
 * Remove candidate from bucket
 */
router.delete('/:bucketId/candidates/:candidateId', async (req, res) => {
  try {
    const { bucketId, candidateId } = req.params;
    const removedBy = req.headers['x-user-email'] || 'system';
    
    const bucket = await shortlistService.getBucketById(bucketId);
    if (!bucket) {
      return res.status(404).json({
        success: false,
        error: 'Bucket not found'
      });
    }
    
    await db.query(
      'DELETE FROM bucket_candidates WHERE bucket_id = $1 AND candidate_id = $2',
      [bucket.id, candidateId]
    );
    
    res.json({
      success: true,
      message: 'Candidate removed from bucket'
    });
    
  } catch (error) {
    console.error('Error removing candidate:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/shortlist/:bucketId/candidates/:candidateId
 * Update candidate in bucket (priority, notes)
 */
router.put('/:bucketId/candidates/:candidateId', async (req, res) => {
  try {
    const { bucketId, candidateId } = req.params;
    const { priority, notes } = req.body;
    const updatedBy = req.headers['x-user-email'] || 'system';
    
    const bucket = await shortlistService.getBucketById(bucketId);
    if (!bucket) {
      return res.status(404).json({
        success: false,
        error: 'Bucket not found'
      });
    }
    
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (priority) {
      updates.push(`priority = $${++paramCount}`);
      params.push(priority);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${++paramCount}`);
      params.push(notes);
    }
    
    if (updates.length > 0) {
      params.push(bucket.id, candidateId);
      await db.query(
        `UPDATE bucket_candidates 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE bucket_id = $${++paramCount} AND candidate_id = $${++paramCount}`,
        params
      );
    }
    
    res.json({
      success: true,
      message: 'Candidate updated in bucket'
    });
    
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/shortlist/:bucketId/share
 * Share bucket with other users
 */
router.post('/:bucketId/share', async (req, res) => {
  try {
    const { bucketId } = req.params;
    const { userIds } = req.body;
    const sharedBy = req.headers['x-user-email'] || 'system';
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }
    
    const result = await shortlistService.shareBucket(bucketId, userIds, sharedBy);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error sharing bucket:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/shortlist/merge
 * Merge two buckets
 */
router.post('/merge', async (req, res) => {
  try {
    const { sourceBucketId, targetBucketId } = req.body;
    const performedBy = req.headers['x-user-email'] || 'system';
    
    if (!sourceBucketId || !targetBucketId) {
      return res.status(400).json({
        success: false,
        error: 'Source and target bucket IDs are required'
      });
    }
    
    const result = await shortlistService.mergeBuckets(
      sourceBucketId,
      targetBucketId,
      performedBy
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error merging buckets:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/shortlist/:bucketId
 * Delete (deactivate) bucket
 */
router.delete('/:bucketId', async (req, res) => {
  try {
    const { bucketId } = req.params;
    const deletedBy = req.headers['x-user-email'] || 'system';
    
    const bucket = await shortlistService.getBucketById(bucketId);
    if (!bucket) {
      return res.status(404).json({
        success: false,
        error: 'Bucket not found'
      });
    }
    
    await db.query(
      'UPDATE shortlist_buckets SET is_active = false WHERE id = $1',
      [bucket.id]
    );
    
    res.json({
      success: true,
      message: 'Bucket deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting bucket:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/shortlist/cleanup
 * Clean up expired buckets
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleaned = await shortlistService.cleanupExpiredBuckets();
    
    res.json({
      success: true,
      cleanedCount: cleaned.length,
      buckets: cleaned
    });
    
  } catch (error) {
    console.error('Error cleaning up:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
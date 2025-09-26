// recruitment-backend/routes/searchSync.routes.js
const express = require('express');
const router = express.Router();
const searchService = require('../../services/search/searchService');
const searchIndexer = require('../../services/search/searchIndexer');

/**
 * POST /api/search-sync/create-index
 * Create or update the Azure Search index schema
 */
router.post('/create-index', async (req, res) => {
  try {
    const result = await searchService.createOrUpdateIndex();
    
    res.json({
      success: true,
      message: 'Index created/updated successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Error creating index:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/search-sync/index-candidate/:candidateId
 * Index a specific candidate
 */
router.post('/index-candidate/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const result = await searchService.indexCandidate(parseInt(candidateId));
    
    res.json({
      success: true,
      message: `Candidate ${candidateId} indexed successfully`,
      ...result
    });
    
  } catch (error) {
    console.error('Error indexing candidate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/search-sync/bulk-index
 * Bulk index all candidates
 */
router.post('/bulk-index', async (req, res) => {
  try {
    // Start bulk indexing in background
    searchService.bulkIndexAllCandidates()
      .then(result => {
        console.log('Bulk indexing completed:', result);
      })
      .catch(error => {
        console.error('Bulk indexing failed:', error);
      });
    
    res.json({
      success: true,
      message: 'Bulk indexing started in background'
    });
    
  } catch (error) {
    console.error('Error starting bulk index:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/search-sync/sync-modified
 * Sync candidates modified since a specific date
 */
router.post('/sync-modified', async (req, res) => {
  try {
    const { sinceDate } = req.body;
    
    const result = await searchIndexer.syncModifiedCandidates(
      sinceDate ? new Date(sinceDate) : null
    );
    
    res.json({
      success: true,
      message: 'Modified candidates synced',
      ...result
    });
    
  } catch (error) {
    console.error('Error syncing modified candidates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/search-sync/remove-candidate/:candidateId
 * Remove a candidate from the index
 */
router.delete('/remove-candidate/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const result = await searchService.deleteFromIndex(parseInt(candidateId));
    
    res.json({
      success: true,
      message: `Candidate ${candidateId} removed from index`,
      ...result
    });
    
  } catch (error) {
    console.error('Error removing candidate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/search-sync/stats
 * Get indexing statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await searchIndexer.getIndexingStats();
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/search-sync/search
 * Search with the new schema
 */
router.post('/search', async (req, res) => {
  try {
    const { query, filters } = req.body;
    
    const results = await searchService.searchCandidates(query, filters);
    
    res.json(results);
    
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
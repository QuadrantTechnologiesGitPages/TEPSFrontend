// recruitment-backend/services/search/searchIndexer.js
const searchService = require('./searchService');
const db = require('../../data/database');

class SearchIndexer {
  /**
   * Set up database triggers for automatic indexing
   */
  async setupIndexingTriggers() {
    try {
      // Trigger when candidate is added to shortlist
      await this.onShortlistChange();
      
      // Trigger when interview is scheduled/updated
      await this.onInterviewChange();
      
      // Trigger when submission status changes
      await this.onSubmissionChange();
      
      // Trigger when placement is created
      await this.onPlacementChange();
      
      // Trigger when AI questions are generated
      await this.onQuestionsGenerated();
      
      console.log('✅ Search indexing triggers set up');
      
    } catch (error) {
      console.error('Error setting up triggers:', error);
    }
  }

  /**
   * Index when candidate is added to shortlist bucket
   */
  async onShortlistChange() {
    // This would ideally be a database trigger, but we'll use it as a function
    // to be called from the shortlist service
    return async (candidateId, bucketId, action) => {
      try {
        console.log(`Indexing shortlist change for candidate ${candidateId}`);
        
        // Re-index the candidate to update bucket information
        await searchService.indexCandidate(candidateId);
        
        // Log the indexing
        await this.logIndexing('shortlist_change', candidateId, { bucketId, action });
        
      } catch (error) {
        console.error('Error indexing shortlist change:', error);
      }
    };
  }

  /**
   * Index when interview status changes
   */
  async onInterviewChange() {
    return async (interviewId) => {
      try {
        // Get candidate ID from interview
        const result = await db.query(
          'SELECT candidate_id FROM interviews WHERE id = $1',
          [interviewId]
        );
        
        if (result.rows.length > 0) {
          const candidateId = result.rows[0].candidate_id;
          console.log(`Indexing interview change for candidate ${candidateId}`);
          
          await searchService.indexCandidate(candidateId);
          await this.logIndexing('interview_change', candidateId, { interviewId });
        }
        
      } catch (error) {
        console.error('Error indexing interview change:', error);
      }
    };
  }

  /**
   * Index when submission status changes
   */
  async onSubmissionChange() {
    return async (submissionId, type = 'vendor') => {
      try {
        const table = type === 'vendor' ? 'vendor_submissions' : 'client_submissions';
        
        const result = await db.query(
          `SELECT candidate_id FROM ${table} WHERE id = $1`,
          [submissionId]
        );
        
        if (result.rows.length > 0) {
          const candidateId = result.rows[0].candidate_id;
          console.log(`Indexing submission change for candidate ${candidateId}`);
          
          await searchService.indexCandidate(candidateId);
          await this.logIndexing('submission_change', candidateId, { submissionId, type });
        }
        
      } catch (error) {
        console.error('Error indexing submission change:', error);
      }
    };
  }

  /**
   * Index when placement is created/updated
   */
  async onPlacementChange() {
    return async (placementId) => {
      try {
        const result = await db.query(
          'SELECT candidate_id FROM placements WHERE id = $1',
          [placementId]
        );
        
        if (result.rows.length > 0) {
          const candidateId = result.rows[0].candidate_id;
          console.log(`Indexing placement change for candidate ${candidateId}`);
          
          await searchService.indexCandidate(candidateId);
          await this.logIndexing('placement_change', candidateId, { placementId });
        }
        
      } catch (error) {
        console.error('Error indexing placement change:', error);
      }
    };
  }

  /**
   * Index when AI questions are generated
   */
  async onQuestionsGenerated() {
    return async (candidateId, questionCount) => {
      try {
        console.log(`Indexing AI questions for candidate ${candidateId}`);
        
        // Update just the question-related fields
        await searchService.updatePartialDocument(candidateId, {
          questions_generated: questionCount,
          updated_at: new Date()
        });
        
        await this.logIndexing('questions_generated', candidateId, { questionCount });
        
      } catch (error) {
        console.error('Error indexing questions:', error);
      }
    };
  }

  /**
   * Re-index candidates modified since last sync
   */
  async syncModifiedCandidates(sinceDate) {
    try {
      const query = `
        SELECT DISTINCT c.id
        FROM candidates c
        LEFT JOIN interviews i ON c.id = i.candidate_id
        LEFT JOIN vendor_submissions vs ON c.id = vs.candidate_id
        LEFT JOIN client_submissions cs ON c.id = cs.candidate_id
        WHERE 
          c.updated_at > $1
          OR i.updated_at > $1
          OR vs.last_updated > $1
          OR cs.submitted_at > $1
        ORDER BY c.id
      `;
      
      const result = await db.query(query, [sinceDate || new Date(Date.now() - 24*60*60*1000)]);
      
      console.log(`Found ${result.rows.length} candidates to sync`);
      
      let synced = 0;
      for (const row of result.rows) {
        try {
          await searchService.indexCandidate(row.id);
          synced++;
        } catch (error) {
          console.error(`Failed to sync candidate ${row.id}:`, error.message);
        }
      }
      
      return {
        success: true,
        totalModified: result.rows.length,
        synced
      };
      
    } catch (error) {
      console.error('Error syncing modified candidates:', error);
      throw error;
    }
  }

  /**
   * Log indexing operations
   */
  async logIndexing(operation, candidateId, details = {}) {
    try {
      await db.query(
        `INSERT INTO search_index_logs (
          operation, candidate_id, details, indexed_at
        ) VALUES ($1, $2, $3, NOW())`,
        [operation, candidateId, JSON.stringify(details)]
      );
    } catch (error) {
      // Silently fail logging
    }
  }

  /**
   * Get indexing statistics
   */
  async getIndexingStats() {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(DISTINCT candidate_id) as indexed_candidates,
          COUNT(*) as total_operations,
          MAX(indexed_at) as last_indexed_at,
          operation,
          COUNT(*) as operation_count
        FROM search_index_logs
        WHERE indexed_at > NOW() - INTERVAL '7 days'
        GROUP BY operation
      `);
      
      return {
        success: true,
        stats: stats.rows
      };
      
    } catch (error) {
      console.error('Error getting indexing stats:', error);
      throw error;
    }
  }
}

module.exports = new SearchIndexer();
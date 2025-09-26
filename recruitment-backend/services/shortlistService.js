// recruitment-backend/services/shortlistService.js
const db = require('../data/database');
const searchService = require('./search/searchService');
const searchIndexer = require('./search/searchIndexer');

class ShortlistService {
  /**
   * Create a new shortlist bucket
   */
  async createBucket(bucketData, createdBy) {
    try {
      const {
        name,
        description,
        requirementId,
        jdText,
        clientName,
        expiryDays = 30
      } = bucketData;
      
      // Validate bucket name is unique for user
      const existing = await db.query(
        'SELECT id FROM shortlist_buckets WHERE name = $1 AND created_by = $2 AND is_active = true',
        [name, createdBy]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('Bucket with this name already exists');
      }
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      
      // Create bucket
      const query = `
        INSERT INTO shortlist_buckets (
          bucket_id, name, description, requirement_id, jd_text,
          client_name, created_by, expires_at, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
        RETURNING *
      `;
      
      const bucketId = `BKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await db.query(query, [
        bucketId, name, description, requirementId, jdText,
        clientName, createdBy, expiryDate
      ]);
      
      const bucket = result.rows[0];
      
      // Log activity
      await this.logActivity('bucket_created', bucket.id, null, 
        `Bucket "${name}" created`, createdBy);
      
      return {
        success: true,
        bucket,
        message: `Bucket "${name}" created successfully`
      };
      
    } catch (error) {
      console.error('Error creating bucket:', error);
      throw error;
    }
  }

  /**
   * Add candidates to bucket
   */
  async addCandidatesToBucket(bucketId, candidateIds, addedBy, metadata = {}) {
    try {
      // Verify bucket exists and is active
      const bucket = await this.getBucketById(bucketId);
      if (!bucket) {
        throw new Error('Bucket not found');
      }
      
      if (!bucket.is_active) {
        throw new Error('Bucket is inactive');
      }
      
      if (new Date(bucket.expires_at) < new Date()) {
        throw new Error('Bucket has expired');
      }
      
      const added = [];
      const skipped = [];
      
      for (const candidateId of candidateIds) {
        // Check if already in bucket
        const existing = await db.query(
          'SELECT id FROM shortlist_candidates WHERE bucket_id = $1 AND candidate_id = $2',
          [bucket.id, candidateId]
        );
        
        if (existing.rows.length > 0) {
          skipped.push(candidateId);
          continue;
        }
        
        // Add to bucket with metadata
        const insertQuery = `
          INSERT INTO shortlist_candidates (
            bucket_id, candidate_id, added_by, match_score,
            match_reasons, priority, notes, added_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id
        `;
        
        await db.query(insertQuery, [
          bucket.id,
          candidateId,
          addedBy,
          metadata.matchScore || null,
          metadata.matchReasons || null,
          metadata.priority || 'normal',
          metadata.notes || null
        ]);
        
        added.push(candidateId);
        
        // Trigger search indexing for this candidate
        try {
          const indexHandler = await searchIndexer.onShortlistChange();
          await indexHandler(candidateId, bucket.id, 'added');
        } catch (indexError) {
          console.error(`Failed to index candidate ${candidateId}:`, indexError);
          // Don't fail the operation if indexing fails
        }
      }
      
      // Update bucket stats
      await this.updateBucketStats(bucket.id);
      
      // Log activity
      if (added.length > 0) {
        await this.logActivity('candidates_added', bucket.id, null,
          `${added.length} candidates added to bucket`, addedBy);
      }
      
      return {
        success: true,
        added: added.length,
        skipped: skipped.length,
        totalInBucket: await this.getBucketCandidateCount(bucket.id)
      };
      
    } catch (error) {
      console.error('Error adding candidates to bucket:', error);
      throw error;
    }
  }

  /**
   * Add candidates from search results
   */
  async addFromSearchResults(bucketId, searchQuery, filters = {}, addedBy) {
    try {
      // Perform search
      const searchResults = await searchService.searchCandidates(searchQuery, {
        ...filters,
        top: filters.limit || 50
      });
      
      // Extract candidate IDs and metadata
      const candidatesToAdd = [];
      const metadata = {};
      
      for (const result of searchResults.candidates) {
        const candidateId = result.candidate_id;
        candidatesToAdd.push(candidateId);
        
        // Store match metadata for each candidate
        metadata[candidateId] = {
          matchScore: result.searchScore || result.match_score,
          matchReasons: result.matchReasons || 
                       this.generateMatchReasons(searchQuery, result)
        };
      }
      
      // Add to bucket with metadata
      const added = [];
      for (const candidateId of candidatesToAdd) {
        const result = await this.addCandidatesToBucket(
          bucketId,
          [candidateId],
          addedBy,
          metadata[candidateId]
        );
        if (result.added > 0) {
          added.push(candidateId);
        }
      }
      
      return {
        success: true,
        searchResultsCount: searchResults.candidates.length,
        addedCount: added.length,
        message: `Added ${added.length} candidates from search results`
      };
      
    } catch (error) {
      console.error('Error adding from search:', error);
      throw error;
    }
  }

  /**
   * Remove candidate from bucket
   */
  async removeFromBucket(bucketId, candidateId, removedBy) {
    try {
      const bucket = await this.getBucketById(bucketId);
      if (!bucket) {
        throw new Error('Bucket not found');
      }
      
      // Remove from bucket
      const result = await db.query(
        'DELETE FROM shortlist_candidates WHERE bucket_id = $1 AND candidate_id = $2 RETURNING id',
        [bucket.id, candidateId]
      );
      
      if (result.rows.length > 0) {
        // Trigger search indexing for this candidate
        try {
          const indexHandler = await searchIndexer.onShortlistChange();
          await indexHandler(candidateId, bucket.id, 'removed');
        } catch (indexError) {
          console.error(`Failed to index candidate ${candidateId}:`, indexError);
        }
        
        // Log activity
        await this.logActivity('candidate_removed', bucket.id, candidateId,
          `Candidate removed from bucket`, removedBy);
        
        return {
          success: true,
          message: 'Candidate removed from bucket'
        };
      }
      
      return {
        success: false,
        message: 'Candidate not found in bucket'
      };
      
    } catch (error) {
      console.error('Error removing from bucket:', error);
      throw error;
    }
  }

  /**
   * Get bucket with candidates
   */
  async getBucketWithCandidates(bucketId, options = {}) {
    try {
      const bucket = await this.getBucketById(bucketId);
      if (!bucket) {
        throw new Error('Bucket not found');
      }
      
      // Get candidates in bucket
      const query = `
        SELECT 
          sc.*,
          c.name, c.email, c.phone,
          c.status as candidate_status
        FROM shortlist_candidates sc
        JOIN candidates c ON sc.candidate_id = c.id
        WHERE sc.bucket_id = $1
        ORDER BY 
          CASE sc.priority 
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
          END,
          sc.match_score DESC NULLS LAST
      `;
      
      const result = await db.query(query, [bucket.id]);
      
      const candidates = result.rows.map(row => ({
        id: row.candidate_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        status: row.candidate_status,
        // Bucket-specific data
        addedAt: row.added_at,
        addedBy: row.added_by,
        matchScore: row.match_score,
        matchReasons: row.match_reasons,
        priority: row.priority,
        notes: row.notes
      }));
      
      return {
        bucket,
        candidates,
        stats: {
          total: candidates.length,
          highPriority: candidates.filter(c => c.priority === 'high').length,
          avgMatchScore: this.calculateAvgScore(candidates),
          readyForSubmission: candidates.filter(c => c.status === 'active').length
        }
      };
      
    } catch (error) {
      console.error('Error getting bucket with candidates:', error);
      throw error;
    }
  }

  /**
   * Perform bulk action on bucket
   */
  async performBulkAction(bucketId, action, params = {}, performedBy) {
    try {
      const bucket = await this.getBucketWithCandidates(bucketId);
      let result;
      
      switch (action) {
        case 'send_to_recruiter':
          result = await this.sendToRecruiter(bucket, params, performedBy);
          break;
          
        case 'schedule_interviews':
          result = await this.scheduleInterviews(bucket, params, performedBy);
          break;
          
        case 'submit_to_vendor':
          result = await this.submitToVendor(bucket, params, performedBy);
          break;
          
        case 'export':
          result = await this.exportBucket(bucket, params);
          break;
          
        case 'share':
          result = await this.shareBucket(bucketId, params.sharedWith, performedBy);
          break;
          
        case 'merge':
          result = await this.mergeBuckets(bucketId, params.targetBucketId, performedBy);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // Trigger search indexing for all affected candidates
      if (['submit_to_vendor', 'schedule_interviews'].includes(action)) {
        for (const candidate of bucket.candidates) {
          try {
            await searchService.indexCandidate(candidate.id);
          } catch (indexError) {
            console.error(`Failed to index candidate ${candidate.id}:`, indexError);
          }
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('Error performing bulk action:', error);
      throw error;
    }
  }

  /**
   * Send bucket to recruiter for review
   */
  async sendToRecruiter(bucket, params, performedBy) {
    const { recruiterEmail, message, priority } = params;
    
    // Create a task/notification for recruiter
    const taskId = await this.createRecruiterTask({
      bucketId: bucket.bucket.id,
      assignedTo: recruiterEmail,
      candidateCount: bucket.candidates.length,
      priority: priority || 'normal',
      message,
      createdBy: performedBy
    });
    
    // Log activity
    await this.logActivity('sent_to_recruiter', bucket.bucket.id, null,
      `Bucket sent to ${recruiterEmail} for review`, performedBy);
    
    return {
      success: true,
      taskId,
      message: `${bucket.candidates.length} candidates sent to ${recruiterEmail}`
    };
  }

  /**
   * Schedule interviews for bucket candidates
   */
  async scheduleInterviews(bucket, params, performedBy) {
    const { interviewType, scheduleDates, interviewerEmails } = params;
    
    const scheduled = [];
    const failed = [];
    
    for (const candidate of bucket.candidates) {
      try {
        const interviewId = await this.createInterviewSchedule({
          candidateId: candidate.id,
          bucketId: bucket.bucket.id,
          type: interviewType,
          proposedDates: scheduleDates,
          interviewers: interviewerEmails
        });
        
        scheduled.push({ candidateId: candidate.id, interviewId });
      } catch (error) {
        failed.push({ candidateId: candidate.id, error: error.message });
      }
    }
    
    return {
      success: true,
      scheduled: scheduled.length,
      failed: failed.length,
      details: { scheduled, failed }
    };
  }

  /**
   * Submit candidates to vendor
   */
  async submitToVendor(bucket, params, performedBy) {
    const { vendorId, vendorEmail, rate, notes } = params;
    
    // Record submission
    const submissionId = await this.recordVendorSubmission({
      bucketId: bucket.bucket.id,
      vendorId,
      vendorEmail,
      candidateIds: bucket.candidates.map(c => c.id),
      rate,
      notes,
      submittedBy: performedBy
    });
    
    // Update candidate status
    for (const candidate of bucket.candidates) {
      await db.query(
        `INSERT INTO vendor_submissions 
         (candidate_id, vendor_id, bucket_id, submitted_by, rate, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, 'submitted', NOW())
         ON CONFLICT DO NOTHING`,
        [candidate.id, vendorId, bucket.bucket.id, performedBy, rate]
      );
    }
    
    return {
      success: true,
      submissionId,
      candidatesSubmitted: bucket.candidates.length,
      vendor: vendorEmail
    };
  }

  /**
   * Get user's buckets
   */
  async getUserBuckets(userId, includeShared = true) {
    let query = `
      SELECT DISTINCT
        b.*,
        COUNT(DISTINCT sc.candidate_id) as candidate_count,
        MAX(sc.added_at) as last_updated
      FROM shortlist_buckets b
      LEFT JOIN shortlist_candidates sc ON b.id = sc.bucket_id
      WHERE b.is_active = true
        AND b.expires_at > NOW()
    `;
    
    if (includeShared) {
      query += ` AND (b.created_by = $1 OR b.id IN (
        SELECT bucket_id FROM bucket_shares WHERE shared_with = $1
      ))`;
    } else {
      query += ` AND b.created_by = $1`;
    }
    
    query += ` GROUP BY b.id ORDER BY b.created_at DESC`;
    
    const result = await db.query(query, [userId]);
    
    return result.rows.map(row => ({
      ...row,
      isExpiring: new Date(row.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      daysRemaining: Math.ceil((new Date(row.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    }));
  }

  /**
   * Share bucket with other users
   */
  async shareBucket(bucketId, sharedWith, sharedBy) {
    const bucket = await this.getBucketById(bucketId);
    if (!bucket) throw new Error('Bucket not found');
    
    const shared = [];
    for (const userId of sharedWith) {
      // Check if already shared
      const existing = await db.query(
        'SELECT id FROM bucket_shares WHERE bucket_id = $1 AND shared_with = $2',
        [bucket.id, userId]
      );
      
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO bucket_shares (bucket_id, shared_with, shared_by, permissions, shared_at)
           VALUES ($1, $2, $3, 'read', NOW())`,
          [bucket.id, userId, sharedBy]
        );
        shared.push(userId);
      }
    }
    
    return {
      success: true,
      sharedWith: shared,
      message: `Bucket shared with ${shared.length} users`
    };
  }

  /**
   * Merge two buckets
   */
  async mergeBuckets(sourceBucketId, targetBucketId, performedBy) {
    const sourceBucket = await this.getBucketWithCandidates(sourceBucketId);
    const targetBucket = await this.getBucketById(targetBucketId);
    
    if (!targetBucket) throw new Error('Target bucket not found');
    
    // Move all candidates to target bucket
    let moved = 0;
    const movedCandidateIds = [];
    
    for (const candidate of sourceBucket.candidates) {
      const result = await this.addCandidatesToBucket(
        targetBucketId,
        [candidate.id],
        performedBy,
        {
          matchScore: candidate.matchScore,
          matchReasons: candidate.matchReasons,
          notes: `Merged from bucket: ${sourceBucket.bucket.name}`
        }
      );
      if (result.added > 0) {
        moved++;
        movedCandidateIds.push(candidate.id);
      }
    }
    
    // Deactivate source bucket
    await db.query(
      'UPDATE shortlist_buckets SET is_active = false WHERE id = $1',
      [sourceBucket.bucket.id]
    );
    
    // Trigger search indexing for all moved candidates
    for (const candidateId of movedCandidateIds) {
      try {
        await searchService.indexCandidate(candidateId);
      } catch (indexError) {
        console.error(`Failed to index candidate ${candidateId}:`, indexError);
      }
    }
    
    return {
      success: true,
      candidatesMoved: moved,
      message: `${moved} candidates merged into ${targetBucket.name}`
    };
  }

  /**
   * Update candidate priority in bucket
   */
  async updateCandidatePriority(bucketId, candidateId, priority, updatedBy) {
    try {
      const result = await db.query(
        `UPDATE shortlist_candidates 
         SET priority = $1, updated_at = NOW() 
         WHERE bucket_id = $2 AND candidate_id = $3
         RETURNING id`,
        [priority, bucketId, candidateId]
      );
      
      if (result.rows.length > 0) {
        // Trigger search indexing
        try {
          await searchService.updatePartialDocument(candidateId, {
            updated_at: new Date()
          });
        } catch (indexError) {
          console.error(`Failed to update index for candidate ${candidateId}:`, indexError);
        }
        
        return {
          success: true,
          message: 'Priority updated'
        };
      }
      
      return {
        success: false,
        message: 'Candidate not found in bucket'
      };
      
    } catch (error) {
      console.error('Error updating priority:', error);
      throw error;
    }
  }

  /**
   * Clean up expired buckets
   */
  async cleanupExpiredBuckets() {
    const result = await db.query(
      `UPDATE shortlist_buckets 
       SET is_active = false 
       WHERE expires_at < NOW() AND is_active = true
       RETURNING id, name`
    );
    
    if (result.rows.length > 0) {
      // Get all candidates from expired buckets for indexing
      const candidateQuery = `
        SELECT DISTINCT candidate_id 
        FROM shortlist_candidates 
        WHERE bucket_id IN (${result.rows.map(r => r.id).join(',')})
      `;
      
      const candidates = await db.query(candidateQuery);
      
      // Trigger search indexing for affected candidates
      for (const row of candidates.rows) {
        try {
          await searchService.indexCandidate(row.candidate_id);
        } catch (indexError) {
          console.error(`Failed to index candidate ${row.candidate_id}:`, indexError);
        }
      }
    }
    
    console.log(`🧹 Cleaned up ${result.rows.length} expired buckets`);
    return result.rows;
  }

  /**
   * Helper methods
   */
  async getBucketById(bucketId) {
    const result = await db.query(
      'SELECT * FROM shortlist_buckets WHERE (id = $1 OR bucket_id = $1)',
      [bucketId]
    );
    return result.rows[0];
  }
  
  async getBucketCandidateCount(bucketId) {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM shortlist_candidates WHERE bucket_id = $1',
      [bucketId]
    );
    return parseInt(result.rows[0].count);
  }
  
  async updateBucketStats(bucketId) {
    await db.query(
      `UPDATE shortlist_buckets 
       SET updated_at = NOW() 
       WHERE id = $1`,
      [bucketId]
    );
  }
  
  calculateAvgScore(candidates) {
    const scores = candidates.filter(c => c.matchScore).map(c => c.matchScore);
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  
  generateMatchReasons(query, candidate) {
    const reasons = [];
    const queryLower = query.toLowerCase();
    
    if (candidate.skills && Array.isArray(candidate.skills)) {
      const matchedSkills = candidate.skills.filter(skill =>
        queryLower.includes(skill.toLowerCase())
      );
      if (matchedSkills.length > 0) {
        reasons.push(`Skills: ${matchedSkills.join(', ')}`);
      }
    }
    
    if (candidate.experience_years) {
      reasons.push(`${candidate.experience_years} years experience`);
    }
    
    if (candidate.visa_status) {
      reasons.push(`Visa: ${candidate.visa_status}`);
    }
    
    return reasons.length > 0 ? reasons : ['Matched search criteria'];
  }
  
  async logActivity(action, bucketId, candidateId, description, performedBy) {
    await db.query(
      `INSERT INTO activity_logs (action, description, user_email, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [action, description, performedBy]
    );
  }
  
  async createRecruiterTask(taskData) {
    // This will be implemented when we have task management
    return `TASK-${Date.now()}`;
  }
  
  async createInterviewSchedule(scheduleData) {
    // This will be implemented with interview service
    return `INT-${Date.now()}`;
  }
  
  async recordVendorSubmission(submissionData) {
    // This will be implemented with placement service
    return `SUB-${Date.now()}`;
  }
  
  async exportBucket(bucket, format = 'csv') {
    // Export bucket data in specified format
    const candidates = bucket.candidates;
    
    if (format === 'csv') {
      const headers = ['Name', 'Email', 'Phone', 'Status', 'Match Score', 'Priority'];
      const rows = candidates.map(c => [
        c.name, c.email, c.phone, c.status,
        c.matchScore || '', c.priority || 'normal'
      ]);
      
      return {
        success: true,
        format: 'csv',
        data: [headers, ...rows]
      };
    }
    
    return {
      success: true,
      format: 'json',
      data: candidates
    };
  }
}

module.exports = new ShortlistService();
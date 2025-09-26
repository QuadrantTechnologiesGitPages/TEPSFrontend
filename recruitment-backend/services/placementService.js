// recruitment-backend/services/placementService.js
const db = require('../data/database');
const communicationService = require('./communicationService');
const searchService = require('./search/searchService');
const searchIndexer = require('./search/searchIndexer');

class PlacementService {
  constructor() {
    this.submissionStatuses = {
      PENDING: 'pending',
      SUBMITTED: 'submitted',
      ACKNOWLEDGED: 'acknowledged',
      IN_REVIEW: 'in_review',
      SHORTLISTED: 'shortlisted',
      REJECTED: 'rejected',
      INTERVIEW_SCHEDULED: 'interview_scheduled',
      INTERVIEWED: 'interviewed',
      SELECTED: 'selected',
      OFFER_MADE: 'offer_made',
      OFFER_ACCEPTED: 'offer_accepted',
      JOINED: 'joined',
      DROPPED: 'dropped'
    };
  }

  /**
   * Submit candidate to vendor
   */
  async submitToVendor(submissionData) {
    try {
      const {
        candidateId,
        vendorId,
        requirementId,
        submittedBy,
        rateCard,
        availableFrom,
        notes,
        documents = []
      } = submissionData;

      // Check if already submitted to this vendor for same requirement
      const existing = await this.checkExistingSubmission(
        candidateId,
        vendorId,
        requirementId,
        'vendor'
      );

      if (existing) {
        return {
          success: false,
          error: 'Candidate already submitted to this vendor for the same requirement',
          existingSubmission: existing
        };
      }

      // Create submission record
      const submissionQuery = `
        INSERT INTO vendor_submissions (
          submission_id, candidate_id, vendor_id, requirement_id,
          status, rate_card, available_from, notes, submitted_by,
          submitted_at, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;

      const submissionId = this.generateSubmissionId('VND');
      
      const values = [
        submissionId,
        candidateId,
        vendorId,
        requirementId,
        this.submissionStatuses.SUBMITTED,
        JSON.stringify(rateCard || {}),
        availableFrom,
        notes,
        submittedBy
      ];

      const result = await db.query(submissionQuery, values);
      const submission = result.rows[0];

      // Store document references if any
      if (documents.length > 0) {
        await this.attachDocuments(submission.id, documents, 'vendor');
      }

      // Create activity log
      await this.logActivity({
        type: 'vendor_submission',
        candidateId,
        vendorId,
        submissionId: submission.id,
        performedBy: submittedBy,
        details: `Submitted to vendor: ${await this.getVendorName(vendorId)}`
      });

      // Send notification to vendor
      await this.notifyVendor(submission);

      // Update candidate status
      await this.updateCandidateStatus(candidateId, 'submitted_to_vendor');

      // Trigger search indexing for this candidate
      try {
        const indexHandler = await searchIndexer.onSubmissionChange();
        await indexHandler(submission.id, 'vendor');
      } catch (indexError) {
        console.error(`Failed to index submission ${submission.id}:`, indexError);
      }

      return {
        success: true,
        submission,
        message: 'Successfully submitted to vendor'
      };

    } catch (error) {
      console.error('Error submitting to vendor:', error);
      throw error;
    }
  }

  /**
   * Submit candidate to client (through vendor or direct)
   */
  async submitToClient(submissionData) {
    try {
      const {
        candidateId,
        clientId,
        vendorSubmissionId, // If going through vendor
        requirementId,
        submittedBy,
        billRate,
        startDate,
        endClient,
        location,
        notes
      } = submissionData;

      // Check existing submission
      const existing = await this.checkExistingSubmission(
        candidateId,
        clientId,
        requirementId,
        'client'
      );

      if (existing) {
        return {
          success: false,
          error: 'Candidate already submitted to this client',
          existingSubmission: existing
        };
      }

      // Create client submission
      const submissionQuery = `
        INSERT INTO client_submissions (
          submission_id, candidate_id, client_id, vendor_submission_id,
          requirement_id, status, bill_rate, proposed_start_date,
          end_client, location, notes, submitted_by, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *
      `;

      const submissionId = this.generateSubmissionId('CLT');
      
      const values = [
        submissionId,
        candidateId,
        clientId,
        vendorSubmissionId,
        requirementId,
        this.submissionStatuses.SUBMITTED,
        billRate,
        startDate,
        endClient,
        location,
        notes,
        submittedBy
      ];

      const result = await db.query(submissionQuery, values);
      const submission = result.rows[0];

      // Update vendor submission status if applicable
      if (vendorSubmissionId) {
        await this.updateVendorSubmissionStatus(
          vendorSubmissionId,
          this.submissionStatuses.SHORTLISTED
        );
      }

      // Log activity
      await this.logActivity({
        type: 'client_submission',
        candidateId,
        clientId,
        submissionId: submission.id,
        performedBy: submittedBy,
        details: `Submitted to client: ${await this.getClientName(clientId)}`
      });

      // Send notifications
      await this.notifyClient(submission);
      await this.notifyCandidateAboutSubmission(candidateId, clientId);

      // Trigger search indexing for this candidate
      try {
        const indexHandler = await searchIndexer.onSubmissionChange();
        await indexHandler(submission.id, 'client');
      } catch (indexError) {
        console.error(`Failed to index submission ${submission.id}:`, indexError);
      }

      return {
        success: true,
        submission,
        message: 'Successfully submitted to client'
      };

    } catch (error) {
      console.error('Error submitting to client:', error);
      throw error;
    }
  }

  /**
   * Update submission status with tracking
   */
  async updateSubmissionStatus(submissionId, status, type = 'vendor', notes = '') {
    try {
      const table = type === 'vendor' ? 'vendor_submissions' : 'client_submissions';
      
      // Get current submission
      const current = await db.query(
        `SELECT * FROM ${table} WHERE id = $1`,
        [submissionId]
      );

      if (current.rows.length === 0) {
        throw new Error('Submission not found');
      }

      const submission = current.rows[0];

      // Update status
      const updateQuery = `
        UPDATE ${table}
        SET status = $1, last_updated = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await db.query(updateQuery, [status, submissionId]);
      const updated = result.rows[0];

      // Create status history entry
      await this.createStatusHistory({
        submissionId,
        submissionType: type,
        oldStatus: submission.status,
        newStatus: status,
        notes
      });

      // Handle status-specific actions
      await this.handleStatusChange(updated, status, type);

      // Trigger search indexing
      try {
        await searchService.indexCandidate(submission.candidate_id);
      } catch (indexError) {
        console.error(`Failed to index candidate ${submission.candidate_id}:`, indexError);
      }

      return {
        success: true,
        submission: updated,
        previousStatus: submission.status
      };

    } catch (error) {
      console.error('Error updating submission status:', error);
      throw error;
    }
  }

  /**
   * Track offer made to candidate
   */
  async createOffer(offerData) {
    try {
      const {
        candidateId,
        clientSubmissionId,
        offerAmount,
        startDate,
        endDate,
        location,
        positionTitle,
        terms,
        createdBy
      } = offerData;

      const offerQuery = `
        INSERT INTO placement_offers (
          offer_id, candidate_id, client_submission_id,
          offer_amount, start_date, end_date, location,
          position_title, terms, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *
      `;

      const offerId = this.generateSubmissionId('OFR');
      
      const values = [
        offerId,
        candidateId,
        clientSubmissionId,
        offerAmount,
        startDate,
        endDate,
        location,
        positionTitle,
        JSON.stringify(terms || {}),
        'pending',
        createdBy
      ];

      const result = await db.query(offerQuery, values);
      const offer = result.rows[0];

      // Update client submission status
      await this.updateSubmissionStatus(
        clientSubmissionId,
        this.submissionStatuses.OFFER_MADE,
        'client'
      );

      // Notify candidate about offer
      await this.notifyCandidateAboutOffer(offer);

      // Trigger search indexing
      try {
        await searchService.indexCandidate(candidateId);
      } catch (indexError) {
        console.error(`Failed to index candidate ${candidateId}:`, indexError);
      }

      return {
        success: true,
        offer,
        message: 'Offer created successfully'
      };

    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Update offer response (accept/reject/negotiate)
   */
  async respondToOffer(offerId, response, details = {}) {
    try {
      const { action, counterOffer, reason, respondedBy } = details;

      // Validate action
      if (!['accept', 'reject', 'negotiate'].includes(action)) {
        throw new Error('Invalid offer response action');
      }

      // Get offer details first
      const offerResult = await db.query(
        'SELECT * FROM placement_offers WHERE id = $1',
        [offerId]
      );
      
      if (offerResult.rows.length === 0) {
        throw new Error('Offer not found');
      }
      
      const existingOffer = offerResult.rows[0];

      // Update offer
      const updateQuery = `
        UPDATE placement_offers
        SET status = $1, 
            response_date = NOW(),
            response_details = $2,
            responded_by = $3
        WHERE id = $4
        RETURNING *
      `;

      const responseDetails = {
        action,
        counterOffer,
        reason,
        timestamp: new Date()
      };

      const result = await db.query(updateQuery, [
        action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'negotiating',
        JSON.stringify(responseDetails),
        respondedBy,
        offerId
      ]);

      const offer = result.rows[0];

      // If accepted, create placement record
      if (action === 'accept') {
        await this.createPlacement(offer);
      }

      // Update submission status
      const newStatus = action === 'accept' ? 
        this.submissionStatuses.OFFER_ACCEPTED :
        action === 'reject' ? 
        this.submissionStatuses.REJECTED :
        this.submissionStatuses.IN_REVIEW;

      await this.updateSubmissionStatus(
        offer.client_submission_id,
        newStatus,
        'client'
      );

      // Trigger search indexing
      try {
        await searchService.indexCandidate(offer.candidate_id);
      } catch (indexError) {
        console.error(`Failed to index candidate ${offer.candidate_id}:`, indexError);
      }

      return {
        success: true,
        offer,
        message: `Offer ${action}ed successfully`
      };

    } catch (error) {
      console.error('Error responding to offer:', error);
      throw error;
    }
  }

  /**
   * Create final placement record
   */
  async createPlacement(offer) {
    const placementQuery = `
      INSERT INTO placements (
        placement_id, candidate_id, client_id, vendor_id,
        offer_id, start_date, end_date, bill_rate,
        pay_rate, position_title, location, status,
        created_at
      )
      SELECT 
        $1, o.candidate_id, cs.client_id, vs.vendor_id,
        o.id, o.start_date, o.end_date, cs.bill_rate,
        vs.rate_card->>'payRate', o.position_title, o.location,
        'active', NOW()
      FROM placement_offers o
      JOIN client_submissions cs ON o.client_submission_id = cs.id
      LEFT JOIN vendor_submissions vs ON cs.vendor_submission_id = vs.id
      WHERE o.id = $2
      RETURNING *
    `;

    const placementId = this.generateSubmissionId('PLC');
    const result = await db.query(placementQuery, [placementId, offer.id]);
    
    // Update candidate status to placed
    await this.updateCandidateStatus(offer.candidate_id, 'placed');
    
    // Notify all stakeholders
    await this.notifyPlacementSuccess(result.rows[0]);
    
    // Trigger search indexing with placement info
    try {
      const indexHandler = await searchIndexer.onPlacementChange();
      await indexHandler(result.rows[0].id);
    } catch (indexError) {
      console.error(`Failed to index placement ${result.rows[0].id}:`, indexError);
    }
    
    return result.rows[0];
  }

  /**
   * Update placement status
   */
  async updatePlacementStatus(placementId, status, updatedBy) {
    try {
      const result = await db.query(
        `UPDATE placements 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2
         RETURNING *`,
        [status, placementId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Placement not found');
      }
      
      const placement = result.rows[0];
      
      // Log activity
      await this.logActivity({
        type: 'placement_status_update',
        candidateId: placement.candidate_id,
        placementId,
        performedBy: updatedBy,
        details: `Placement status updated to: ${status}`
      });
      
      // Trigger search indexing
      try {
        await searchService.indexCandidate(placement.candidate_id);
      } catch (indexError) {
        console.error(`Failed to index candidate ${placement.candidate_id}:`, indexError);
      }
      
      return {
        success: true,
        placement,
        message: 'Placement status updated'
      };
      
    } catch (error) {
      console.error('Error updating placement status:', error);
      throw error;
    }
  }

  /**
   * Get submission pipeline for a candidate
   */
  async getCandidatePipeline(candidateId) {
    try {
      // Get all vendor submissions
      const vendorSubs = await db.query(`
        SELECT vs.*, v.company_name as vendor_name
        FROM vendor_submissions vs
        JOIN vendors v ON vs.vendor_id = v.id
        WHERE vs.candidate_id = $1
        ORDER BY vs.submitted_at DESC
      `, [candidateId]);

      // Get all client submissions
      const clientSubs = await db.query(`
        SELECT cs.*, c.company_name as client_name
        FROM client_submissions cs
        JOIN clients c ON cs.client_id = c.id
        WHERE cs.candidate_id = $1
        ORDER BY cs.submitted_at DESC
      `, [candidateId]);

      // Get all offers
      const offers = await db.query(`
        SELECT * FROM placement_offers
        WHERE candidate_id = $1
        ORDER BY created_at DESC
      `, [candidateId]);

      // Get placement if any
      const placement = await db.query(`
        SELECT * FROM placements
        WHERE candidate_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [candidateId]);

      return {
        vendorSubmissions: vendorSubs.rows,
        clientSubmissions: clientSubs.rows,
        offers: offers.rows,
        placement: placement.rows[0] || null,
        summary: {
          totalVendorSubmissions: vendorSubs.rows.length,
          totalClientSubmissions: clientSubs.rows.length,
          totalOffers: offers.rows.length,
          isPlaced: placement.rows.length > 0
        }
      };

    } catch (error) {
      console.error('Error getting candidate pipeline:', error);
      throw error;
    }
  }

  /**
   * Get all active placements
   */
  async getActivePlacements(filters = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          c.name as candidate_name,
          cl.company_name as client_name,
          v.company_name as vendor_name
        FROM placements p
        JOIN candidates c ON p.candidate_id = c.id
        JOIN clients cl ON p.client_id = cl.id
        LEFT JOIN vendors v ON p.vendor_id = v.id
        WHERE p.status = 'active'
      `;

      const params = [];
      
      // Add filters if provided
      if (filters.clientId) {
        params.push(filters.clientId);
        query += ` AND p.client_id = $${params.length}`;
      }

      if (filters.vendorId) {
        params.push(filters.vendorId);
        query += ` AND p.vendor_id = $${params.length}`;
      }

      if (filters.startDate) {
        params.push(filters.startDate);
        query += ` AND p.start_date >= $${params.length}`;
      }

      query += ' ORDER BY p.start_date DESC';

      const result = await db.query(query, params);

      return {
        success: true,
        placements: result.rows,
        count: result.rows.length
      };

    } catch (error) {
      console.error('Error getting active placements:', error);
      throw error;
    }
  }

  /**
   * Bulk submit candidates
   */
  async bulkSubmitToVendor(candidateIds, vendorData, submittedBy) {
    try {
      const submitted = [];
      const failed = [];
      
      for (const candidateId of candidateIds) {
        try {
          const result = await this.submitToVendor({
            candidateId,
            ...vendorData,
            submittedBy
          });
          
          if (result.success) {
            submitted.push(candidateId);
          } else {
            failed.push({ candidateId, error: result.error });
          }
        } catch (error) {
          failed.push({ candidateId, error: error.message });
        }
      }
      
      // Trigger bulk search indexing
      if (submitted.length > 0) {
        for (const candidateId of submitted) {
          try {
            await searchService.indexCandidate(candidateId);
          } catch (indexError) {
            console.error(`Failed to index candidate ${candidateId}:`, indexError);
          }
        }
      }
      
      return {
        success: true,
        submitted: submitted.length,
        failed: failed.length,
        details: { submitted, failed }
      };
      
    } catch (error) {
      console.error('Error in bulk submit:', error);
      throw error;
    }
  }

  /**
   * Track placement performance metrics
   */
  async getPlacementMetrics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      // Base metrics query
      let metricsQuery = `
        SELECT 
          COUNT(DISTINCT p.id) as total_placements,
          COUNT(DISTINCT p.candidate_id) as unique_candidates,
          COUNT(DISTINCT p.client_id) as unique_clients,
          COUNT(DISTINCT p.vendor_id) as unique_vendors,
          AVG(p.bill_rate::numeric) as avg_bill_rate,
          AVG(p.pay_rate::numeric) as avg_pay_rate
        FROM placements p
        WHERE 1=1
      `;

      const params = [];
      
      if (startDate) {
        params.push(startDate);
        metricsQuery += ` AND p.created_at >= $${params.length}`;
      }
      
      if (endDate) {
        params.push(endDate);
        metricsQuery += ` AND p.created_at <= $${params.length}`;
      }

      const metrics = await db.query(metricsQuery, params);

      // Conversion funnel
      const funnelQuery = `
        SELECT 
          COUNT(DISTINCT vs.candidate_id) as vendor_submissions,
          COUNT(DISTINCT cs.candidate_id) as client_submissions,
          COUNT(DISTINCT i.candidate_id) as interviewed,
          COUNT(DISTINCT o.candidate_id) as offers_made,
          COUNT(DISTINCT p.candidate_id) as placements
        FROM vendor_submissions vs
        LEFT JOIN client_submissions cs ON vs.candidate_id = cs.candidate_id
        LEFT JOIN interviews i ON cs.candidate_id = i.candidate_id
        LEFT JOIN placement_offers o ON cs.candidate_id = o.candidate_id
        LEFT JOIN placements p ON o.candidate_id = p.candidate_id
      `;

      const funnel = await db.query(funnelQuery);

      // Time to placement
      const timeQuery = `
        SELECT 
          AVG(EXTRACT(DAY FROM (p.created_at - c.created_at))) as avg_days_to_placement
        FROM placements p
        JOIN candidates c ON p.candidate_id = c.id
      `;

      const timeMetrics = await db.query(timeQuery);

      return {
        success: true,
        metrics: metrics.rows[0],
        funnel: funnel.rows[0],
        timeToPlacement: timeMetrics.rows[0],
        dateRange: { startDate, endDate }
      };

    } catch (error) {
      console.error('Error getting placement metrics:', error);
      throw error;
    }
  }

  /**
   * Withdraw submission
   */
  async withdrawSubmission(submissionId, type = 'vendor', reason, withdrawnBy) {
    try {
      const table = type === 'vendor' ? 'vendor_submissions' : 'client_submissions';
      
      const result = await db.query(
        `UPDATE ${table} 
         SET status = 'withdrawn', 
             last_updated = NOW(),
             notes = notes || $1
         WHERE id = $2
         RETURNING *`,
        [` | Withdrawn: ${reason}`, submissionId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Submission not found');
      }
      
      const submission = result.rows[0];
      
      // Create status history
      await this.createStatusHistory({
        submissionId,
        submissionType: type,
        oldStatus: submission.status,
        newStatus: 'withdrawn',
        notes: reason
      });
      
      // Trigger search indexing
      try {
        await searchService.indexCandidate(submission.candidate_id);
      } catch (indexError) {
        console.error(`Failed to index candidate ${submission.candidate_id}:`, indexError);
      }
      
      return {
        success: true,
        submission,
        message: 'Submission withdrawn successfully'
      };
      
    } catch (error) {
      console.error('Error withdrawing submission:', error);
      throw error;
    }
  }

  // Helper methods
  async checkExistingSubmission(candidateId, targetId, requirementId, type) {
    const table = type === 'vendor' ? 'vendor_submissions' : 'client_submissions';
    const field = type === 'vendor' ? 'vendor_id' : 'client_id';
    
    const result = await db.query(
      `SELECT * FROM ${table} 
       WHERE candidate_id = $1 AND ${field} = $2 
       AND requirement_id = $3 AND status != 'rejected' AND status != 'withdrawn'`,
      [candidateId, targetId, requirementId]
    );
    
    return result.rows[0];
  }

  generateSubmissionId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createStatusHistory(data) {
    const query = `
      INSERT INTO submission_status_history (
        submission_id, submission_type, old_status, 
        new_status, notes, changed_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await db.query(query, [
      data.submissionId,
      data.submissionType,
      data.oldStatus,
      data.newStatus,
      data.notes
    ]);
  }

  async handleStatusChange(submission, newStatus, type) {
    // Trigger status-specific actions
    switch(newStatus) {
      case this.submissionStatuses.INTERVIEW_SCHEDULED:
        // Could trigger AI question generation here
        console.log('Interview scheduled - prepare questions');
        break;
      case this.submissionStatuses.SELECTED:
        // Could prepare offer letter template
        console.log('Candidate selected - prepare offer');
        break;
      case this.submissionStatuses.JOINED:
        // Update placement record
        console.log('Candidate joined - update placement');
        break;
    }
  }

  async getVendorName(vendorId) {
    const result = await db.query(
      'SELECT company_name FROM vendors WHERE id = $1',
      [vendorId]
    );
    return result.rows[0]?.company_name || 'Unknown';
  }

  async getClientName(clientId) {
    const result = await db.query(
      'SELECT company_name FROM clients WHERE id = $1',
      [clientId]
    );
    return result.rows[0]?.company_name || 'Unknown';
  }

  async updateCandidateStatus(candidateId, status) {
    await db.query(
      'UPDATE candidates SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, candidateId]
    );
  }

  async updateVendorSubmissionStatus(vendorSubmissionId, status) {
    await db.query(
      'UPDATE vendor_submissions SET status = $1, last_updated = NOW() WHERE id = $2',
      [status, vendorSubmissionId]
    );
  }

  async attachDocuments(submissionId, documents, type) {
    // Placeholder for document attachment logic
    console.log(`Attaching ${documents.length} documents to ${type} submission ${submissionId}`);
  }

  async logActivity(activity) {
    const query = `
      INSERT INTO placement_activities (
        activity_type, candidate_id, vendor_id, client_id,
        submission_id, performed_by, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;
    
    await db.query(query, [
      activity.type,
      activity.candidateId,
      activity.vendorId,
      activity.clientId,
      activity.submissionId,
      activity.performedBy,
      activity.details
    ]);
  }

  // Notification methods (placeholders - implement based on your communication service)
  async notifyVendor(submission) {
    console.log('Notifying vendor about submission:', submission.submission_id);
  }

  async notifyClient(submission) {
    console.log('Notifying client about submission:', submission.submission_id);
  }

  async notifyCandidateAboutSubmission(candidateId, clientId) {
    console.log('Notifying candidate about submission');
  }

  async notifyCandidateAboutOffer(offer) {
    console.log('Notifying candidate about offer:', offer.offer_id);
  }

  async notifyPlacementSuccess(placement) {
    console.log('Notifying about successful placement:', placement.placement_id);
  }
}

module.exports = new PlacementService();
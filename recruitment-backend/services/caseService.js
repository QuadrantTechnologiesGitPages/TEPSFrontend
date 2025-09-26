// recruitment-backend/services/caseService.js
const db = require('../data/database');

class CaseService {
  // Status flow configuration
  statusFlow = {
    'Created': {
      next: 'Acknowledged',
      trigger: 'acknowledgment_sent',
      auto: true
    },
    'Acknowledged': {
      next: 'Intake Sent',
      trigger: 'intake_form_sent',
      auto: true
    },
    'Intake Sent': {
      next: 'Intake Received',
      trigger: 'form_response_received',
      auto: true
    },
    'Intake Received': {
      next: 'In Verification',
      trigger: 'verification_started',
      auto: false // Manual trigger when phone call starts
    },
    'In Verification': {
      next: 'Verification Complete',
      trigger: 'verification_data_saved',
      auto: true,
      validation: 'checkVerificationComplete'
    },
    'Verification Complete': {
      next: 'Profile Update',
      trigger: 'profile_update_started',
      auto: true
    },
    'Profile Update': {
      next: 'Ready for Creation',
      trigger: 'all_fields_validated',
      auto: true,
      validation: 'checkAllFieldsComplete'
    },
    'Ready for Creation': {
      next: 'Candidate Created',
      trigger: 'candidate_created',
      auto: true
    },
    'Candidate Created': {
      next: 'Closed',
      trigger: 'case_closed',
      auto: true
    }
  };

  /**
   * Get case by ID with full details
   */
  async getCaseById(caseId) {
    const query = `
      SELECT 
        c.*,
        sm.status_name,
        pd.name as candidate_name,
        pd.email as candidate_email,
        pd.phone_number,
        pd.skills,
        pd.years_of_experience,
        pd.referrer_id,
        u.user_name as assigned_to
      FROM cases c
      LEFT JOIN status_master sm ON c.case_status_id = sm.id
      LEFT JOIN primary_data pd ON c.pdata_id = pd.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [caseId]);
    return result.rows[0];
  }

  /**
   * Get all cases with filters
   */
  async getCases(filters = {}) {
    let query = `
      SELECT 
        c.id,
        c.created_at,
        sm.status_name,
        pd.name as candidate_name,
        pd.email as candidate_email,
        pd.phone_number,
        u.user_name as assigned_to,
        c.is_case_forwarded,
        c.updated_at
      FROM cases c
      LEFT JOIN status_master sm ON c.case_status_id = sm.id
      LEFT JOIN primary_data pd ON c.pdata_id = pd.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.status) {
      query += ` AND sm.status_name = $${++paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.userId) {
      query += ` AND c.user_id = $${++paramCount}`;
      params.push(filters.userId);
    }
    
    if (filters.dateFrom) {
      query += ` AND c.created_at >= $${++paramCount}`;
      params.push(filters.dateFrom);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Trigger status transition
   */
  async triggerStatusTransition(caseId, trigger, data = {}) {
    try {
      // Get current case status
      const currentCase = await this.getCaseById(caseId);
      if (!currentCase) throw new Error('Case not found');
      
      const currentStatus = currentCase.status_name;
      const flowConfig = this.statusFlow[currentStatus];
      
      if (!flowConfig) {
        console.log(`⚠️ No flow configured for status: ${currentStatus}`);
        return { success: false, message: 'Invalid status flow' };
      }
      
      // Check if this is the correct trigger
      if (flowConfig.trigger !== trigger) {
        console.log(`⚠️ Invalid trigger ${trigger} for status ${currentStatus}`);
        return { success: false, message: 'Invalid trigger for current status' };
      }
      
      // Run validation if configured
      if (flowConfig.validation) {
        const isValid = await this[flowConfig.validation](caseId, data);
        if (!isValid) {
          console.log(`⚠️ Validation failed for ${flowConfig.validation}`);
          return { success: false, message: 'Validation failed', validation: flowConfig.validation };
        }
      }
      
      // Update to next status
      const nextStatus = flowConfig.next;
      await this.updateCaseStatus(caseId, nextStatus, trigger);
      
      // Handle auto-transitions
      if (flowConfig.auto && this.statusFlow[nextStatus]) {
        const nextFlow = this.statusFlow[nextStatus];
        if (nextFlow.auto && !nextFlow.validation) {
          // Auto-trigger next transition after 1 second
          setTimeout(() => {
            this.triggerStatusTransition(caseId, nextFlow.trigger, data)
              .catch(err => console.error('Auto-transition failed:', err));
          }, 1000);
        }
      }
      
      // Perform status-specific actions
      await this.performStatusActions(caseId, nextStatus, data);
      
      return { 
        success: true, 
        previousStatus: currentStatus,
        newStatus: nextStatus,
        autoTransition: flowConfig.auto
      };
      
    } catch (error) {
      console.error('Status transition error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update case status
   */
  async updateCaseStatus(caseId, statusName, trigger) {
    const query = `
      UPDATE cases 
      SET 
        case_status_id = (SELECT id FROM status_master WHERE status_name = $1),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    await db.query(query, [statusName, caseId]);
    
    // Log activity
    await db.query(
      `INSERT INTO activity_logs (case_id, action, description, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [caseId, `status_${statusName.toLowerCase().replace(' ', '_')}`, 
       `Status changed to ${statusName} via ${trigger}`]
    );
    
    console.log(`✅ Case ${caseId}: ${statusName} (trigger: ${trigger})`);
  }

  /**
   * Perform actions based on new status
   */
  async performStatusActions(caseId, status, data) {
    switch(status) {
      case 'Intake Sent':
        await this.sendIntakeForm(caseId);
        break;
        
      case 'Ready for Creation':
        await this.prepareForCandidateCreation(caseId);
        break;
        
      case 'Candidate Created':
        await this.completeCaseWithCandidate(caseId, data);
        break;
        
      case 'Closed':
        await this.closeCase(caseId);
        break;
    }
  }

  /**
   * Validation: Check if verification is complete
   */
  async checkVerificationComplete(caseId, data) {
    // Check if all verification fields are filled
    const verificationData = data.verificationData;
    if (!verificationData) return false;
    
    const requiredFields = [
      'quadrantRelation',
      'engagement', 
      'priority',
      'currentLocation',
      'visaStatus'
    ];
    
    for (const field of requiredFields) {
      if (!verificationData.checklistItems?.[field]?.verified) {
        return false;
      }
    }
    
    // Check minimum verification score
    return verificationData.verificationScore >= 70;
  }

  /**
   * Validation: Check all required fields are complete
   */
  async checkAllFieldsComplete(caseId) {
    const query = `
      SELECT 
        pd.*,
        sd.*
      FROM cases c
      LEFT JOIN primary_data pd ON c.pdata_id = pd.id
      LEFT JOIN secondary_data sd ON pd.id = sd.primary_data_id
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [caseId]);
    const data = result.rows[0];
    
    if (!data) return false;
    
    // Check required primary fields
    const requiredPrimary = ['name', 'email', 'phone_number', 'skills', 'years_of_experience'];
    for (const field of requiredPrimary) {
      if (!data[field]) return false;
    }
    
    // Check required secondary fields
    const requiredSecondary = ['intake_form_completed', 'verified_by_user_id'];
    for (const field of requiredSecondary) {
      if (!data[field]) return false;
    }
    
    return true;
  }

  /**
   * Get daily tasks for user
   */
  async getDailyTasks(userId, date = new Date()) {
    const query = `
      SELECT 
        c.id as case_id,
        sm.status_name,
        pd.name as candidate_name,
        pd.email as candidate_email,
        c.created_at,
        c.updated_at,
        CASE 
          WHEN sm.status_name = 'Intake Sent' THEN 'Follow up on intake form'
          WHEN sm.status_name = 'Intake Received' THEN 'Schedule verification call'
          WHEN sm.status_name = 'In Verification' THEN 'Complete verification'
          WHEN sm.status_name = 'Profile Update' THEN 'Update candidate profile'
          ELSE 'Review case'
        END as task_description,
        CASE
          WHEN c.updated_at < NOW() - INTERVAL '2 days' THEN 'overdue'
          WHEN c.updated_at < NOW() - INTERVAL '1 day' THEN 'pending'
          ELSE 'normal'
        END as priority
      FROM cases c
      LEFT JOIN status_master sm ON c.case_status_id = sm.id
      LEFT JOIN primary_data pd ON c.pdata_id = pd.id
      WHERE 
        (c.user_id = $1 OR c.user_id IS NULL)
        AND sm.status_name NOT IN ('Closed', 'Candidate Created')
      ORDER BY 
        CASE priority
          WHEN 'overdue' THEN 1
          WHEN 'pending' THEN 2
          ELSE 3
        END,
        c.updated_at ASC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Forward case to another user
   */
  async forwardCase(caseId, toUserId, fromUserId, notes) {
    const query = `
      UPDATE cases 
      SET 
        user_id = $1,
        is_case_forwarded = true,
        forwarded_to_user_id = $1,
        updated_at = NOW()
      WHERE id = $2
    `;
    
    await db.query(query, [toUserId, caseId]);
    
    // Log activity
    await db.query(
      `INSERT INTO activity_logs (case_id, action, description, user_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [caseId, 'case_forwarded', `Case forwarded to user ${toUserId}: ${notes}`, fromUserId]
    );
    
    return { success: true };
  }

  /**
   * Helper methods
   */
  async sendIntakeForm(caseId) {
    // This will integrate with formTemplateService
    console.log(`📋 Sending intake form for case ${caseId}`);
  }
  
  async prepareForCandidateCreation(caseId) {
    // Mark case as ready for candidate creation
    console.log(`✅ Case ${caseId} ready for candidate creation`);
  }
  
  async completeCaseWithCandidate(caseId, data) {
    if (data.candidateId) {
      await db.query(
        'UPDATE cases SET candidate_id = $1 WHERE id = $2',
        [data.candidateId, caseId]
      );
    }
  }
  
  async closeCase(caseId) {
    await db.query(
      'UPDATE cases SET closed_at = NOW() WHERE id = $1',
      [caseId]
    );
  }
}

module.exports = new CaseService();
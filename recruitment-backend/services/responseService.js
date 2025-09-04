// recruitment-backend/services/responseService.js
const database = require('../utils/database');
const emailService = require('./emailService');

class ResponseService {
  /**
   * Submit form response (called by candidate)
   */
  async submitResponse(data) {
    try {
      const { token, responses, metadata } = data;
      
      // Get form details
      const form = await database.getFormByToken(token);
      if (!form) {
        throw new Error('Invalid form token');
      }
      
      // Check if already submitted
      if (form.status === 'completed') {
        throw new Error('Form has already been submitted');
      }
      
      // Check if expired
      if (new Date(form.expires_at) < new Date()) {
        throw new Error('Form has expired');
      }
      
      // Validate required fields
      const validation = this.validateResponses(form.fields, responses);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Extract candidate info from responses
      const candidateName = responses.name || responses.fullName || responses.full_name || 'Unknown';
      const candidateEmail = responses.email || form.candidate_email;
      
      // Save response
      const result = await database.saveResponse({
        formToken: token,
        templateId: form.template_id,
        candidateEmail,
        candidateName,
        responses,
        ip: metadata?.ip || 'unknown',
        userAgent: metadata?.userAgent || 'unknown'
      });
      
      // Update form status
      await database.updateFormStatus(token, 'completed');
      
      // Log activity
      await database.logActivity(
        form.case_id,
        token,
        'form_submitted',
        `Form submitted by ${candidateName}`,
        candidateEmail
      );
      
      // Try to send confirmation email if the method exists
      if (emailService.sendSubmissionConfirmation) {
        try {
          await emailService.sendSubmissionConfirmation({
            candidateEmail,
            candidateName,
            submittedAt: new Date().toISOString()
          });
        } catch (emailError) {
          console.log('Could not send confirmation email:', emailError.message);
          // Don't throw - let the submission succeed even if email fails
        }
      }
      
      // Try to send notification to BSM user if the method exists
      if (emailService.sendResponseNotification) {
        try {
          await emailService.sendResponseNotification({
            bsmEmail: form.sender_email,
            candidateName,
            candidateEmail,
            responseId: result.id
          });
        } catch (emailError) {
          console.log('Could not send notification email:', emailError.message);
          // Don't throw - let the submission succeed even if email fails
        }
      }
      
      // Send real-time notification via WebSocket
      if (global.io) {
        global.io.emit('formResponseReceived', {
          formToken: token,
          candidateEmail,
          candidateName,
          responseId: result.id,
          timestamp: new Date().toISOString()
        });
      }
      
      // Send push notification
      if (global.sendNotification) {
        await global.sendNotification(form.sender_email, {
          type: 'form_response',
          title: 'New Form Response!',
          message: `${candidateName} has submitted their form`,
          priority: 'high',
          data: {
            responseId: result.id,
            formToken: token,
            candidateName,
            candidateEmail
          },
          actionUrl: `/responses/${result.id}`
        });
      }
      
      return {
        success: true,
        message: 'Form submitted successfully',
        responseId: result.id,
        id: result.id // Add this for frontend compatibility
      };
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  }
  
  /**
   * Get all responses (for BSM users)
   */
  async getResponses(filters = {}) {
    try {
      const responses = await database.getResponses(filters);
      
      // Add form details to each response
      const enrichedResponses = await Promise.all(
        responses.map(async (response) => {
          const form = await database.getFormByToken(response.form_token);
          return {
            ...response,
            caseId: form?.case_id,
            senderEmail: form?.sender_email
          };
        })
      );
      
      return enrichedResponses;
    } catch (error) {
      console.error('Error fetching responses:', error);
      throw error;
    }
  }
  
  /**
   * Get single response by ID
   */
  async getResponseById(responseId) {
    try {
      const query = 'SELECT * FROM candidate_responses WHERE id = ?';
      const response = await database.get(query, [responseId]);
      
      if (!response) {
        throw new Error('Response not found');
      }
      
      // Parse response data
      response.response_data = JSON.parse(response.response_data);
      
      // Get form details
      const form = await database.getFormByToken(response.form_token);
      
      // Get template details
      const template = form?.template_id 
        ? await database.getFormTemplateById(form.template_id)
        : null;
      
      return {
        ...response,
        form: {
          caseId: form?.case_id,
          senderEmail: form?.sender_email,
          fields: form?.fields || template?.fields || []
        }
      };
    } catch (error) {
      console.error('Error fetching response:', error);
      throw error;
    }
  }
  
  /**
   * Mark response as processed
   */
  async markAsProcessed(responseId, processedBy) {
    try {
      await database.markResponseProcessed(responseId, processedBy);
      
      // Log activity
      const response = await database.get(
        'SELECT form_token FROM candidate_responses WHERE id = ?',
        [responseId]
      );
      
      if (response) {
        await database.logActivity(
          null,
          response.form_token,
          'response_processed',
          `Response marked as processed by ${processedBy}`,
          processedBy
        );
      }
      
      return {
        success: true,
        message: 'Response marked as processed'
      };
    } catch (error) {
      console.error('Error marking response as processed:', error);
      throw error;
    }
  }
  
  /**
   * Create candidate from response
   */
  async createCandidateFromResponse(responseId, createdBy) {
    try {
      // Get response data
      const response = await this.getResponseById(responseId);
      
      if (!response) {
        throw new Error('Response not found');
      }
      
      if (response.case_created) {
        throw new Error('Candidate already created from this response');
      }
      
      // Extract candidate data from response
      const candidateData = this.extractCandidateData(response.response_data);
      
      // Create case (this would integrate with your existing case management)
      const caseId = `CASE-${Date.now()}`;
      
      // Update response to mark case created
      await database.run(
        'UPDATE candidate_responses SET case_created = 1, case_id = ? WHERE id = ?',
        [caseId, responseId]
      );
      
      // Log activity
      await database.logActivity(
        caseId,
        response.form_token,
        'candidate_created',
        `Candidate profile created from form response`,
        createdBy
      );
      
      return {
        success: true,
        caseId,
        candidateData,
        message: 'Candidate created successfully'
      };
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }
  
  /**
   * Get response statistics
   */
  async getResponseStats() {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed,
          SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN case_created = 1 THEN 1 ELSE 0 END) as casesCreated
        FROM candidate_responses
      `);
      
      return stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total: 0,
        processed: 0,
        pending: 0,
        casesCreated: 0
      };
    }
  }
  
  // ==================== HELPER METHODS ====================
  
  /**
   * Validate responses against form fields
   */
  validateResponses(fields, responses) {
    const errors = [];
    
    for (const field of fields) {
      if (field.required && !responses[field.id]) {
        errors.push(`${field.label} is required`);
      }
      
      // Email validation
      if (field.type === 'email' && responses[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(responses[field.id])) {
          errors.push(`${field.label} must be a valid email`);
        }
      }
      
      // Phone validation
      if (field.type === 'tel' && responses[field.id]) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(responses[field.id])) {
          errors.push(`${field.label} must be a valid phone number`);
        }
      }
      
      // URL validation
      if (field.type === 'url' && responses[field.id]) {
        try {
          new URL(responses[field.id]);
        } catch {
          errors.push(`${field.label} must be a valid URL`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Extract candidate data from form responses
   */
  extractCandidateData(responses) {
    // Map form responses to candidate data structure
    return {
      name: responses.name || responses.fullName || '',
      email: responses.email || '',
      phone: responses.phone || '',
      linkedIn: responses.linkedIn || responses.linkedin || '',
      location: responses.location || responses.currentLocation || '',
      visa: responses.visa || responses.visaStatus || '',
      yearsExp: responses.experience || responses.yearsOfExperience || '',
      skills: this.parseSkills(responses.skills || ''),
      education: responses.education || '',
      currentEmployer: responses.currentEmployer || '',
      availability: responses.availability || '',
      // Add more field mappings as needed
    };
  }
  
  /**
   * Parse skills string into array
   */
  parseSkills(skillsString) {
    if (Array.isArray(skillsString)) {
      return skillsString;
    }
    
    if (typeof skillsString === 'string') {
      return skillsString
        .split(/[,;]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
    }
    
    return [];
  }
}

module.exports = new ResponseService();
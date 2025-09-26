// recruitment-backend/services/emailProcessingService.js
const db = require('../data/database');
const formTemplateService = require('./formTemplateService');
const emailService = require('./emailService');
const searchService = require('./search/searchService');
const pdf = require('pdf-parse');

class EmailProcessingService {
  /**
   * Process incoming email and create case
   */
  async processInboundEmail(emailData) {
    try {
      console.log(`📨 Processing email from: ${emailData.from}`);
      
      // Extract sender information
      const senderInfo = this.extractSenderInfo(emailData.from);
      
      // Extract resume from attachments
      let candidateData = {
        referrer_email: senderInfo.email,
        referrer_name: senderInfo.name,
        source: 'Email Referral',
        received_at: emailData.timestamp
      };
      
      // Process attachments (resumes)
      if (emailData.attachments && emailData.attachments.length > 0) {
        for (const attachment of emailData.attachments) {
          if (this.isResumeFile(attachment.filename || attachment.name)) {
            const resumeBuffer = Buffer.from(attachment.content, 'base64');
            const parsed = await this.parseResume(resumeBuffer, attachment.filename);
            candidateData = { ...candidateData, ...parsed };
            candidateData.resume_url = await this.storeResume(resumeBuffer, attachment.filename);
            break; // Process only first resume
          }
        }
      }
      
      // Parse email body for additional context
      const bodyContext = this.parseEmailBody(emailData.text || emailData.html);
      candidateData = { ...candidateData, ...bodyContext };
      
      // Create primary_data record
      const primaryDataId = await this.createPrimaryData(candidateData);
      
      // Create case with automatic status
      const caseId = await this.createCase({
        primaryDataId,
        senderEmail: senderInfo.email,
        status: 'Created', // Automatic first status
        candidateData
      });
      
      // Log activity
      await db.query(
        `INSERT INTO activity_logs (case_id, action, description, user_email, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [caseId, 'case_created', `Case created from email by ${senderInfo.email}`, senderInfo.email]
      );
      
      // Trigger intake form sending (async)
      this.scheduleIntakeForm(caseId, candidateData).catch(console.error);
      
      return {
        success: true,
        caseId,
        primaryDataId,
        candidateData,
        candidateEmail: candidateData.email,
        candidateName: candidateData.name,
        referrer: senderInfo
      };
      
    } catch (error) {
      console.error('Email processing error:', error);
      throw error;
    }
  }
  
  /**
   * Parse resume using OCR/parsing library
   */
  async parseResume(resumeBuffer, fileName) {
    try {
      const fileExt = fileName?.split('.').pop()?.toLowerCase();
      let extractedText = '';
      let parsedData = {};
      
      if (fileExt === 'pdf') {
        // Parse PDF
        const pdfData = await pdf(resumeBuffer);
        extractedText = pdfData.text;
      } else if (fileExt === 'txt') {
        extractedText = resumeBuffer.toString('utf8');
      } else {
        // For DOC/DOCX, use placeholder or integrate mammoth
        extractedText = 'Document parsing pending';
      }
      
      // Extract structured data from text
      parsedData = this.extractDataFromText(extractedText);
      parsedData.resume_text = extractedText.substring(0, 30000); // For Azure Search
      
      return parsedData;
    } catch (error) {
      console.error('Resume parsing error:', error);
      return {
        resume_text: 'Unable to parse resume',
        parse_error: error.message
      };
    }
  }
  
  /**
   * Extract structured data from resume text
   */
  extractDataFromText(text) {
    const data = {};
    
    // Extract email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.email = emailMatch[0].toLowerCase();
    
    // Extract phone
    const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}/);
    if (phoneMatch) data.phone = phoneMatch[0];
    
    // Extract name (usually at the beginning)
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      // First non-empty line often contains name
      const potentialName = lines[0].trim();
      if (potentialName.length < 50 && !potentialName.includes('@')) {
        data.name = potentialName;
      }
    }
    
    // Extract LinkedIn
    const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
    if (linkedinMatch) data.linkedin_url = `https://${linkedinMatch[0]}`;
    
    // Extract skills (look for common patterns)
    const skillsPatterns = [
      /skills?:?\s*([\s\S]*?)(?:\n\n|\n[A-Z])/i,
      /technical skills?:?\s*([\s\S]*?)(?:\n\n|\n[A-Z])/i,
      /core competenc(?:ies|y):?\s*([\s\S]*?)(?:\n\n|\n[A-Z])/i
    ];
    
    for (const pattern of skillsPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.skills = match[1]
          .split(/[,;|\n]/)
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.length < 50)
          .slice(0, 20); // Limit to 20 skills
        break;
      }
    }
    
    // Extract years of experience
    const expMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
    if (expMatch) {
      data.years_experience = parseInt(expMatch[1]);
    }
    
    // Extract education
    const eduMatch = text.match(/(bachelor|master|phd|diploma|degree|b\.?tech|m\.?tech|mba|b\.?s|m\.?s)(.*?)(?:\n|$)/i);
    if (eduMatch) {
      data.education = eduMatch[0].substring(0, 200);
    }
    
    // Extract location (cities)
    const cities = ['Toronto', 'New York', 'San Francisco', 'Chicago', 'Dallas', 'Austin', 'Seattle', 'Boston', 'Atlanta'];
    for (const city of cities) {
      if (text.includes(city)) {
        data.current_location = city;
        break;
      }
    }
    
    return data;
  }
  
  /**
   * Create primary_data record
   */
  async createPrimaryData(candidateData) {
    const query = `
      INSERT INTO primary_data (
        name, email, phone_number, linkedin_id, 
        years_of_experience, skills, current_employer_name,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `;
    
    const result = await db.query(query, [
      candidateData.name || 'Pending',
      candidateData.email || `pending_${Date.now()}@temp.com`,
      candidateData.phone,
      candidateData.linkedin_url,
      candidateData.years_experience,
      candidateData.skills || [],
      candidateData.current_employer
    ]);
    
    return result.rows[0].id;
  }
  
  /**
   * Create case with workflow status
   */
  async createCase({ primaryDataId, senderEmail, status, candidateData }) {
    // Get status ID from master
    const statusResult = await db.query(
      `SELECT id FROM status_master WHERE status_category = 'case' AND status_name = $1`,
      [status]
    );
    const statusId = statusResult.rows[0]?.id || 1;
    
    // Create case
    const query = `
      INSERT INTO cases (
        case_status_id, pdata_id, created_at
      ) VALUES ($1, $2, NOW())
      RETURNING id
    `;
    
    const result = await db.query(query, [statusId, primaryDataId]);
    const caseId = result.rows[0].id;
    
    console.log(`✅ Case ${caseId} created with status: ${status}`);
    return caseId;
  }
  
  /**
   * Send acknowledgment email
   */
  async sendAcknowledgment({ caseId, referrer, candidateName }) {
    const emailContent = {
      to: referrer.email,
      subject: 'Thank You - Candidate Referral Received',
      body: `Dear ${referrer.name},

Thank you for referring ${candidateName || 'the candidate'} to Quadrant Technologies.

We have received the resume and created Case #${caseId} for tracking. Our recruitment team will review the profile and proceed with the evaluation process.

You will receive updates on the candidate's progress.

Best regards,
Quadrant Recruitment Team`
    };
    
    // Use existing email service (will use mailto for now)
    // TODO: Replace with actual email sending
    return { success: true, emailContent };
  }
  
  /**
   * Schedule intake form sending
   */
  async scheduleIntakeForm(caseId, candidateData) {
    if (!candidateData.email || candidateData.email.includes('temp.com')) {
      console.log('⚠️ No valid candidate email for intake form');
      return;
    }
    
    // Auto-trigger intake form after 5 seconds
    setTimeout(async () => {
      try {
        // Update case status to 'Intake Sent'
        await db.query(
          `UPDATE cases SET case_status_id = 
           (SELECT id FROM status_master WHERE status_name = 'Intake Sent')
           WHERE id = $1`,
          [caseId]
        );
        
        console.log(`📋 Intake form scheduled for case ${caseId}`);
      } catch (error) {
        console.error('Failed to schedule intake form:', error);
      }
    }, 5000);
  }
  
  // Helper methods
  extractSenderInfo(fromString) {
    const match = fromString.match(/^(.*?)\s*<(.+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: 'Unknown', email: fromString.trim() };
  }
  
  isResumeFile(filename) {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext);
  }
  
  parseEmailBody(body) {
    // Extract additional context from email body
    const data = {};
    
    // Look for candidate name mentions
    const namePattern = /candidate:?\s*([^\n,]+)/i;
    const nameMatch = body.match(namePattern);
    if (nameMatch) data.referred_candidate_name = nameMatch[1].trim();
    
    return data;
  }
  
  async storeResume(buffer, filename) {
    // Store in blob storage and return URL
    // For now, return placeholder
    return `https://storage.quadrant.com/resumes/${Date.now()}_${filename}`;
  }
}

module.exports = new EmailProcessingService();
// recruitment-backend/routes/email.routes.js
const express = require('express');
const router = express.Router();
const emailProcessingService = require('../services/emailProcessingService');
const caseService = require('../services/caseService');

/**
 * POST /api/email/inbound
 * Webhook endpoint for receiving emails in real-time
 * Can be triggered by SendGrid, Mailgun, or manual forward
 */
router.post('/inbound', async (req, res) => {
  try {
    console.log('📧 Incoming email received');
    
    // Extract email data based on provider format
    const emailData = {
      from: req.body.from || req.body.sender,
      to: req.body.to || req.body.recipient,
      subject: req.body.subject,
      text: req.body.text || req.body['stripped-text'],
      html: req.body.html || req.body['stripped-html'],
      attachments: req.body.attachments || [],
      headers: req.body.headers || {},
      timestamp: new Date()
    };
    
    // Validate it's for the recruitment DL
    if (!emailData.to?.includes('placeme@quadrant.com') && 
        !emailData.to?.includes(process.env.TEST_EMAIL)) {
      return res.json({ 
        success: false, 
        message: 'Not a recruitment email' 
      });
    }
    
    // Process the email and create case
    const result = await emailProcessingService.processInboundEmail(emailData);
    
    // Send success response immediately (important for webhooks)
    res.status(200).json({ 
      success: true,
      caseId: result.caseId,
      candidateEmail: result.candidateEmail
    });
    
    // Trigger acknowledgment email asynchronously
    setImmediate(async () => {
      try {
        await emailProcessingService.sendAcknowledgment(result);
      } catch (error) {
        console.error('Failed to send acknowledgment:', error);
      }
    });
    
  } catch (error) {
    console.error('Email processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/email/test-inbound
 * Test endpoint for manual email submission
 */
router.post('/test-inbound', async (req, res) => {
  try {
    const { 
      senderEmail, 
      senderName, 
      resumeBase64, 
      resumeFileName,
      emailBody 
    } = req.body;
    
    // Simulate email format
    const emailData = {
      from: `${senderName} <${senderEmail}>`,
      to: process.env.TEST_EMAIL || 'placeme@quadrant.com',
      subject: `New Candidate Referral from ${senderName}`,
      text: emailBody || `Please find attached resume for your consideration.`,
      attachments: resumeBase64 ? [{
        content: resumeBase64,
        filename: resumeFileName || 'resume.pdf',
        type: 'application/pdf',
        disposition: 'attachment'
      }] : [],
      timestamp: new Date()
    };
    
    // Process the email
    const result = await emailProcessingService.processInboundEmail(emailData);
    
    // Send acknowledgment
    const ackResult = await emailProcessingService.sendAcknowledgment(result);
    
    res.json({ 
      success: true,
      message: 'Test email processed successfully',
      caseId: result.caseId,
      candidateData: result.candidateData,
      acknowledgmentSent: ackResult.success
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/email/parse-resume
 * Utility endpoint to test resume parsing
 */
router.post('/parse-resume', async (req, res) => {
  try {
    const { resumeBase64, fileName } = req.body;
    
    if (!resumeBase64) {
      return res.status(400).json({
        success: false,
        error: 'Resume content required'
      });
    }
    
    // Parse resume
    const parsedData = await emailProcessingService.parseResume(
      Buffer.from(resumeBase64, 'base64'),
      fileName
    );
    
    res.json({
      success: true,
      parsedData
    });
    
  } catch (error) {
    console.error('Resume parsing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/email/webhook-config
 * Get webhook configuration instructions
 */
router.get('/webhook-config', (req, res) => {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  
  res.json({
    sendgrid: {
      webhookUrl: `${baseUrl}/api/email/inbound`,
      instructions: 'Configure in SendGrid Inbound Parse settings'
    },
    mailgun: {
      webhookUrl: `${baseUrl}/api/email/inbound`,
      instructions: 'Configure in Mailgun Routes'
    },
    microsoft: {
      webhookUrl: `${baseUrl}/api/email/inbound`,
      instructions: 'Use Graph API subscriptions'
    },
    manual: {
      testUrl: `${baseUrl}/api/email/test-inbound`,
      instructions: 'POST with senderEmail, resumeBase64, etc.'
    }
  });
});

module.exports = router;
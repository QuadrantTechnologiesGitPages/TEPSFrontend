// recruitment-backend/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const database = require('../utils/database');

// ==================== GMAIL WEBHOOK ====================

// Gmail push notification webhook
router.post('/gmail', async (req, res) => {
  try {
    // Verify the webhook is from Google
    const pubsubMessage = req.body.message;
    
    if (!pubsubMessage) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    
    // Decode the message
    const messageData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
    const notification = JSON.parse(messageData);
    
    console.log('📨 Gmail webhook received:', notification);
    
    // Process the notification
    if (notification.historyId) {
      await processGmailNotification(notification);
    }
    
    // Acknowledge receipt
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Gmail webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Process Gmail notification
async function processGmailNotification(notification) {
  try {
    const { emailAddress, historyId } = notification;
    
    // Log the webhook event
    await database.logActivity(
      null,
      null,
      'gmail_webhook',
      `Gmail notification received for ${emailAddress}`,
      emailAddress
    );
    
    // Trigger a check for new emails
    // You could emit an event here to trigger the polling service
    if (global.io) {
      global.io.emit('checkEmails', { 
        email: emailAddress, 
        provider: 'gmail' 
      });
    }
    
  } catch (error) {
    console.error('Error processing Gmail notification:', error);
  }
}

// ==================== OUTLOOK/OFFICE365 WEBHOOK ====================

// Microsoft Graph webhook subscription validation
router.post('/outlook', async (req, res) => {
  try {
    // Check if this is a validation request
    const validationToken = req.query.validationToken;
    
    if (validationToken) {
      // Microsoft is validating the webhook endpoint
      console.log('✅ Outlook webhook validation successful');
      return res.send(validationToken);
    }
    
    // Process the notification
    const { value } = req.body;
    
    if (value && value.length > 0) {
      for (const notification of value) {
        await processOutlookNotification(notification);
      }
    }
    
    // Acknowledge receipt
    res.status(202).send();
    
  } catch (error) {
    console.error('Outlook webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Process Outlook notification
async function processOutlookNotification(notification) {
  try {
    const { 
      subscriptionId, 
      changeType, 
      resource,
      clientState 
    } = notification;
    
    console.log('📨 Outlook webhook received:', {
      subscriptionId,
      changeType,
      resource
    });
    
    // Extract email details from resource
    if (changeType === 'created' && resource.includes('/messages/')) {
      // New email received
      const messageId = resource.split('/messages/')[1];
      
      await database.logActivity(
        null,
        null,
        'outlook_webhook',
        `New email notification: ${messageId}`,
        null
      );
      
      // Trigger email check
      if (global.io) {
        global.io.emit('checkEmails', { 
          messageId,
          provider: 'outlook' 
        });
      }
    }
    
  } catch (error) {
    console.error('Error processing Outlook notification:', error);
  }
}

// ==================== FORM SUBMISSION WEBHOOK ====================

// Direct form submission webhook (for embedded forms)
router.post('/form-submission', async (req, res) => {
  try {
    const { token, responses, signature } = req.body;
    
    // Verify signature to ensure request is legitimate
    if (!verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Get form
    const form = await database.getFormByToken(token);
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (form.status === 'completed') {
      return res.status(400).json({ error: 'Form already completed' });
    }
    
    // Update form status
    await database.updateFormStatus(token, 'completed', {
      response_data: responses
    });
    
    // Log activity
    await database.logActivity(
      form.case_id,
      token,
      'form_webhook_submission',
      'Form submitted via webhook',
      form.candidate_email
    );
    
    // Notify via WebSocket
    if (global.io) {
      global.io.to(`case-${form.case_id}`).emit('formCompleted', {
        token,
        caseId: form.case_id,
        candidateEmail: form.candidate_email,
        completedAt: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true,
      message: 'Form submission received' 
    });
    
  } catch (error) {
    console.error('Form submission webhook error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// ==================== SENDGRID WEBHOOK ====================

// SendGrid email events webhook
router.post('/sendgrid', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      await processSendGridEvent(event);
    }
    
    res.status(200).send();
    
  } catch (error) {
    console.error('SendGrid webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function processSendGridEvent(event) {
  try {
    const { 
      event: eventType, 
      email,
      form_token,
      timestamp 
    } = event;
    
    console.log(`📧 SendGrid event: ${eventType} for ${email}`);
    
    // Update email tracking based on event
    switch (eventType) {
      case 'delivered':
        await database.run(
          `UPDATE email_tracking 
           SET status = 'delivered', updated_at = CURRENT_TIMESTAMP 
           WHERE form_token = ?`,
          [form_token]
        );
        break;
        
      case 'open':
        await database.updateFormStatus(form_token, 'opened');
        await database.logActivity(
          null,
          form_token,
          'email_opened',
          `Email opened by ${email}`,
          email
        );
        break;
        
      case 'click':
        await database.updateFormStatus(form_token, 'opened');
        await database.logActivity(
          null,
          form_token,
          'link_clicked',
          `Form link clicked by ${email}`,
          email
        );
        break;
        
      case 'bounce':
      case 'dropped':
        await database.run(
          `UPDATE email_tracking 
           SET status = 'failed', updated_at = CURRENT_TIMESTAMP 
           WHERE form_token = ?`,
          [form_token]
        );
        break;
    }
    
  } catch (error) {
    console.error('Error processing SendGrid event:', error);
  }
}

// ==================== STATUS WEBHOOK ====================

// Generic status update webhook
router.post('/status', async (req, res) => {
  try {
    const { 
      token, 
      status, 
      timestamp,
      metadata 
    } = req.body;
    
    const form = await database.getFormByToken(token);
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Update form status
    await database.updateFormStatus(token, status, metadata);
    
    // Log activity
    await database.logActivity(
      form.case_id,
      token,
      'status_webhook',
      `Status updated to ${status} via webhook`,
      null
    );
    
    // Notify via WebSocket
    if (global.io) {
      global.io.to(`case-${form.case_id}`).emit('statusUpdate', {
        token,
        status,
        timestamp
      });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Status webhook error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ==================== WEBHOOK REGISTRATION ====================

// Register a new webhook
router.post('/register', async (req, res) => {
  try {
    const { 
      provider, 
      url, 
      events,
      secret 
    } = req.body;
    
    // Store webhook configuration
    // In production, you'd save this to database
    const webhookConfig = {
      id: crypto.randomBytes(16).toString('hex'),
      provider,
      url,
      events,
      secret,
      createdAt: new Date().toISOString()
    };
    
    // Log registration
    await database.logActivity(
      null,
      null,
      'webhook_registered',
      `Webhook registered for ${provider}`,
      null
    );
    
    res.json({
      success: true,
      webhookId: webhookConfig.id,
      message: `Webhook registered for ${provider}`
    });
    
  } catch (error) {
    console.error('Webhook registration error:', error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

// ==================== WEBHOOK VERIFICATION ====================

// Verify webhook endpoint is active
router.get('/verify', (req, res) => {
  res.json({ 
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// ==================== HELPER FUNCTIONS ====================

function verifyWebhookSignature(payload, signature) {
  // Implement signature verification based on your security requirements
  // This is a simple example - use HMAC or similar in production
  
  const secret = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}

// ==================== ERROR HANDLING ====================

// Webhook error handler
router.use((error, req, res, next) => {
  console.error('Webhook error:', error);
  
  // Log the error
  database.logActivity(
    null,
    null,
    'webhook_error',
    error.message,
    null
  ).catch(console.error);
  
  res.status(500).json({ 
    error: 'Webhook processing failed',
    message: error.message 
  });
});

module.exports = router;
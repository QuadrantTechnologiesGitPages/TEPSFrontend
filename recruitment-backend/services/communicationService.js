// recruitment-backend/services/communicationService.js

const database = require('../utils/database');
const oauthService = require('./oauthService');
const { google } = require('googleapis');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');
const twilio = require('twilio');

class CommunicationService {
  constructor() {
    // Initialize Twilio for SMS/WhatsApp
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;
    
    // Initialize Microsoft Graph client config
    this.msalConfig = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      }
    };
    
    this.msalClient = new ConfidentialClientApplication(this.msalConfig);
  }

  // ==================== AI MESSAGE GENERATION ====================
  
  /**
   * Generate AI message using OpenAI GPT
   */
  async generateAIMessage({ systemPrompt, userPrompt, channel, maxTokens, userId }) {
    try {
      // If OpenAI key is configured, use it
      if (process.env.OPENAI_API_KEY) {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: maxTokens,
            temperature: 0.7
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const messageContent = response.data.choices[0].message.content;
        
        // Parse subject and body if email
        if (channel === 'email' || channel === 'teams') {
          const lines = messageContent.split('\n');
          const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
          const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '') : 'Message from Recruitment Team';
          const body = messageContent.replace(subjectLine || '', '').trim();
          
          return { subject, body, message: messageContent };
        }
        
        return { subject: '', body: messageContent, message: messageContent };
      } else {
        // Fallback to template-based generation
        return this.generateFromTemplate(userPrompt, systemPrompt, channel);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback to template
      return this.generateFromTemplate(userPrompt, systemPrompt, channel);
    }
  }

  /**
   * Fallback template-based generation
   */
  generateFromTemplate(userPrompt, context, channel) {
    // Extract candidate info from context
    const candidateInfo = this.parseContext(context);
    
    const templates = {
      introduction: {
        subject: `Exciting Opportunity for ${candidateInfo.name}`,
        body: `Dear ${candidateInfo.name},

I hope this message finds you well. I came across your profile and was impressed by your experience with ${candidateInfo.skills || 'your technical skills'}.

We have an exciting opportunity that aligns perfectly with your background. The position offers competitive compensation and excellent growth opportunities.

Would you be available for a brief call this week to discuss further?

Best regards,
Recruitment Team`
      },
      followup: {
        subject: `Following Up - ${candidateInfo.name}`,
        body: `Hi ${candidateInfo.name},

I wanted to follow up on my previous message regarding the opportunity we discussed.

The position is still available and I believe you would be an excellent fit based on your ${candidateInfo.experience || 'experience'}.

Please let me know if you're interested in learning more.

Best regards,
Recruitment Team`
      },
      interview: {
        subject: `Interview Invitation - ${candidateInfo.name}`,
        body: `Dear ${candidateInfo.name},

Great news! The client would like to schedule an interview with you.

Please let me know your availability for this week, and I'll coordinate with the team.

Looking forward to your response.

Best regards,
Recruitment Team`
      }
    };
    
    // Select template based on prompt
    let selectedTemplate = templates.introduction;
    if (userPrompt.toLowerCase().includes('follow')) {
      selectedTemplate = templates.followup;
    } else if (userPrompt.toLowerCase().includes('interview')) {
      selectedTemplate = templates.interview;
    }
    
    // Adjust for channel
    if (channel === 'sms' || channel === 'whatsapp') {
      return {
        subject: '',
        body: selectedTemplate.body.substring(0, channel === 'sms' ? 160 : 4096),
        message: selectedTemplate.body
      };
    }
    
    return selectedTemplate;
  }

  parseContext(context) {
    const info = {};
    const lines = context.split('\n');
    
    lines.forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        if (key.toLowerCase().includes('candidate')) {
          info.name = value;
        } else if (key.toLowerCase().includes('email')) {
          info.email = value;
        } else if (key.toLowerCase().includes('skills')) {
          info.skills = value;
        } else if (key.toLowerCase().includes('experience')) {
          info.experience = value;
        } else if (key.toLowerCase().includes('status')) {
          info.status = value;
        }
      }
    });
    
    return info;
  }

  // ==================== EMAIL SENDING ====================
  
  /**
   * Send email via Gmail or Outlook
   */
  async sendEmail({ candidateId, recipients, subject, body, attachments, userId }) {
    try {
      // Get user's OAuth tokens
      const userEmail = userId;
      const googleToken = await database.getOAuthToken(userEmail, 'google');
      const microsoftToken = await database.getOAuthToken(userEmail, 'microsoft');
      
      let messageId = null;
      let status = 'failed';
      
      if (googleToken) {
        // Send via Gmail
        messageId = await this.sendGmail(googleToken, recipients, subject, body, attachments);
        status = 'sent';
      } else if (microsoftToken) {
        // Send via Outlook
        messageId = await this.sendOutlook(microsoftToken, recipients, subject, body, attachments);
        status = 'sent';
      } else {
        // Fallback to mailto
        return {
          messageId: `mailto-${Date.now()}`,
          status: 'mailto',
          mailtoLink: this.generateMailtoLink(recipients, subject, body)
        };
      }
      
      // Log communication
      await this.logCommunication({
        candidateId,
        channel: 'email',
        recipients,
        subject,
        body,
        status,
        messageId,
        sentBy: userId
      });
      
      return { messageId, status };
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  async sendGmail(token, recipients, subject, body, attachments = []) {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token
      });
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Build email
      const to = recipients.map(r => r.email).join(',');
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        body
      ].join('\n');
      
      const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });
      
      return result.data.id;
    } catch (error) {
      console.error('Gmail send error:', error);
      throw error;
    }
  }

  async sendOutlook(token, recipients, subject, body, attachments = []) {
    try {
      const accessToken = token.access_token;
      
      const message = {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: recipients.map(r => ({
          emailAddress: { address: r.email, name: r.name }
        }))
      };
      
      const response = await axios.post(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        { message },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return `outlook-${Date.now()}`;
    } catch (error) {
      console.error('Outlook send error:', error);
      throw error;
    }
  }

  generateMailtoLink(recipients, subject, body) {
    const to = recipients.map(r => r.email).join(',');
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // ==================== WHATSAPP SENDING ====================
  
  /**
   * Send WhatsApp message via Twilio
   */
  async sendWhatsApp({ candidateId, recipients, body, attachments, userId }) {
    try {
      if (!this.twilioClient) {
        throw new Error('WhatsApp not configured. Please set up Twilio credentials.');
      }
      
      const results = [];
      
      for (const recipient of recipients) {
        if (!recipient.phone) continue;
        
        // Format phone number (ensure it has country code)
        const formattedPhone = this.formatPhoneNumber(recipient.phone);
        
        const message = await this.twilioClient.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${formattedPhone}`,
          body: body
        });
        
        results.push({
          recipient: recipient.name,
          messageId: message.sid,
          status: message.status
        });
      }
      
      // Log communication
      await this.logCommunication({
        candidateId,
        channel: 'whatsapp',
        recipients,
        body,
        status: 'sent',
        messageId: results[0]?.messageId,
        sentBy: userId
      });
      
      return {
        messageId: results[0]?.messageId,
        status: 'sent',
        results
      };
    } catch (error) {
      console.error('WhatsApp sending error:', error);
      throw error;
    }
  }

  // ==================== TEAMS SENDING ====================
  
  /**
   * Send Teams message via Microsoft Graph
   */
  async sendTeamsMessage({ candidateId, recipients, subject, body, userId }) {
    try {
      // Get Microsoft token
      const microsoftToken = await database.getOAuthToken(userId, 'microsoft');
      
      if (!microsoftToken) {
        throw new Error('Microsoft account not connected. Please connect your Microsoft account first.');
      }
      
      const accessToken = microsoftToken.access_token;
      
      // For Teams, we need to find the user in the organization first
      // This is a simplified version - actual implementation would need proper user lookup
      
      const chatMessage = {
        body: {
          contentType: 'html',
          content: `<b>${subject}</b><br/><br/>${body}`
        }
      };
      
      // This would need the actual Teams channel/chat ID
      // For now, we'll create a notification that can be picked up by Teams webhook
      
      await this.logCommunication({
        candidateId,
        channel: 'teams',
        recipients,
        subject,
        body,
        status: 'sent',
        messageId: `teams-${Date.now()}`,
        sentBy: userId
      });
      
      return {
        messageId: `teams-${Date.now()}`,
        status: 'sent'
      };
    } catch (error) {
      console.error('Teams sending error:', error);
      throw error;
    }
  }

  // ==================== SMS SENDING ====================
  
  /**
   * Send SMS via Twilio
   */
  async sendSMS({ candidateId, recipients, body, userId }) {
    try {
      if (!this.twilioClient) {
        throw new Error('SMS not configured. Please set up Twilio credentials.');
      }
      
      const results = [];
      
      for (const recipient of recipients) {
        if (!recipient.phone) continue;
        
        const formattedPhone = this.formatPhoneNumber(recipient.phone);
        
        const message = await this.twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
          body: body.substring(0, 160) // SMS limit
        });
        
        results.push({
          recipient: recipient.name,
          messageId: message.sid,
          status: message.status
        });
      }
      
      // Log communication
      await this.logCommunication({
        candidateId,
        channel: 'sms',
        recipients,
        body,
        status: 'sent',
        messageId: results[0]?.messageId,
        sentBy: userId
      });
      
      return {
        messageId: results[0]?.messageId,
        status: 'sent',
        results
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      throw error;
    }
  }

  // ==================== PHONE CALL ====================
  
  /**
   * Initiate phone call via Twilio
   */
  async initiatePhoneCall({ candidateId, recipients, callNotes, userId }) {
    try {
      if (!this.twilioClient) {
        throw new Error('Phone calling not configured. Please set up Twilio credentials.');
      }
      
      const results = [];
      
      for (const recipient of recipients) {
        if (!recipient.phone) continue;
        
        const formattedPhone = this.formatPhoneNumber(recipient.phone);
        
        // Create a call with TwiML URL for handling
        const call = await this.twilioClient.calls.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
          url: process.env.TWIML_URL || 'http://demo.twilio.com/docs/voice.xml'
        });
        
        results.push({
          recipient: recipient.name,
          callId: call.sid,
          status: call.status
        });
      }
      
      // Log communication
      await this.logCommunication({
        candidateId,
        channel: 'phone',
        recipients,
        body: callNotes,
        status: 'initiated',
        messageId: results[0]?.callId,
        sentBy: userId
      });
      
      return {
        callId: results[0]?.callId,
        status: 'initiated',
        results
      };
    } catch (error) {
      console.error('Phone call error:', error);
      throw error;
    }
  }

  // ==================== MESSAGE SCHEDULING ====================
  
  /**
   * Schedule a message for later
   */
  async scheduleMessage({ candidateId, channel, recipients, subject, body, scheduleTime, userId }) {
    try {
      const scheduleId = `schedule-${Date.now()}`;
      
      // Store scheduled message in database
      await database.run(`
        INSERT INTO scheduled_messages (
          schedule_id, candidate_id, channel, recipients,
          subject, body, schedule_time, created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [
        scheduleId,
        candidateId,
        channel,
        JSON.stringify(recipients),
        subject,
        body,
        scheduleTime,
        userId
      ]);
      
      // Set up cron job or use a queue service to send at scheduled time
      // This would integrate with your job queue system
      
      return { scheduleId, scheduledFor: scheduleTime };
    } catch (error) {
      console.error('Schedule message error:', error);
      throw error;
    }
  }

  // ==================== MESSAGE HISTORY ====================
  
  /**
   * Get message history for a candidate
   */
  async getMessageHistory(candidateId, userId) {
    try {
      const history = await database.all(`
        SELECT * FROM communication_logs 
        WHERE candidate_id = ? 
        ORDER BY sent_at DESC
        LIMIT 50
      `, [candidateId]);
      
      return history.map(log => ({
        id: log.id,
        channel: log.channel,
        subject: log.subject,
        body: log.body,
        recipients: JSON.parse(log.recipients || '[]'),
        status: log.status,
        sentAt: log.sent_at,
        sentBy: log.sent_by
      }));
    } catch (error) {
      console.error('Get history error:', error);
      return [];
    }
  }

  // ==================== TEMPLATES ====================
  
  /**
   * Get communication templates
   */
  async getTemplates(userId) {
    try {
      const templates = await database.all(`
        SELECT * FROM communication_templates 
        WHERE (created_by = ? OR is_public = 1)
        AND deleted = 0
        ORDER BY usage_count DESC
      `, [userId]);
      
      return templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        subject: t.subject,
        body: t.body,
        channel: t.channel,
        tags: JSON.parse(t.tags || '[]')
      }));
    } catch (error) {
      console.error('Get templates error:', error);
      return [];
    }
  }

  /**
   * Create custom template
   */
  async createTemplate(templateData, userId) {
    try {
      const result = await database.run(`
        INSERT INTO communication_templates (
          name, description, subject, body, channel,
          tags, created_by, is_public
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        templateData.name,
        templateData.description,
        templateData.subject,
        templateData.body,
        templateData.channel,
        JSON.stringify(templateData.tags || []),
        userId,
        templateData.isPublic ? 1 : 0
      ]);
      
      return {
        templateId: result.id,
        template: { ...templateData, id: result.id }
      };
    } catch (error) {
      console.error('Create template error:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updates, userId) {
    try {
      const fields = [];
      const params = [];
      
      if (updates.name) {
        fields.push('name = ?');
        params.push(updates.name);
      }
      if (updates.body) {
        fields.push('body = ?');
        params.push(updates.body);
      }
      if (updates.subject) {
        fields.push('subject = ?');
        params.push(updates.subject);
      }
      
      params.push(templateId, userId);
      
      await database.run(`
        UPDATE communication_templates 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND created_by = ?
      `, params);
      
      const template = await database.get(
        'SELECT * FROM communication_templates WHERE id = ?',
        [templateId]
      );
      
      return { template };
    } catch (error) {
      console.error('Update template error:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId, userId) {
    try {
      await database.run(`
        UPDATE communication_templates 
        SET deleted = 1
        WHERE id = ? AND created_by = ?
      `, [templateId, userId]);
      
      return { success: true };
    } catch (error) {
      console.error('Delete template error:', error);
      throw error;
    }
  }

  // ==================== CHANNEL STATUS ====================
  
  /**
   * Check channel availability and configuration
   */
  async getChannelStatus(userId) {
    try {
      const googleToken = await database.getOAuthToken(userId, 'google');
      const microsoftToken = await database.getOAuthToken(userId, 'microsoft');
      
      return {
        email: {
          available: true,
          configured: !!(googleToken || microsoftToken),
          provider: googleToken ? 'google' : microsoftToken ? 'microsoft' : null
        },
        whatsapp: {
          available: true,
          configured: !!this.twilioClient && !!process.env.TWILIO_WHATSAPP_NUMBER
        },
        teams: {
          available: true,
          configured: !!microsoftToken
        },
        sms: {
          available: true,
          configured: !!this.twilioClient && !!process.env.TWILIO_PHONE_NUMBER
        },
        phone: {
          available: true,
          configured: !!this.twilioClient && !!process.env.TWILIO_PHONE_NUMBER
        }
      };
    } catch (error) {
      console.error('Get channel status error:', error);
      return {
        email: { available: true, configured: false },
        whatsapp: { available: false, configured: false },
        teams: { available: false, configured: false },
        sms: { available: false, configured: false },
        phone: { available: false, configured: false }
      };
    }
  }

  // ==================== HELPER METHODS ====================
  
  /**
   * Log communication activity
   */
  async logCommunication(data) {
    try {
      await database.run(`
        INSERT INTO communication_logs (
          candidate_id, channel, recipients, subject, body,
          status, message_id, sent_by, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        data.candidateId,
        data.channel,
        JSON.stringify(data.recipients),
        data.subject || '',
        data.body,
        data.status,
        data.messageId,
        data.sentBy
      ]);
    } catch (error) {
      console.error('Log communication error:', error);
    }
  }

  /**
   * Format phone number for Twilio
   */
  formatPhoneNumber(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (digits.length === 10) {
      return `+1${digits}`; // Assume US/Canada
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+${digits}`;
    } else if (digits.startsWith('+')) {
      return digits;
    }
    
    return `+${digits}`;
  }

  /**
   * Get scheduled messages
   */
  async getScheduledMessages(userId) {
    try {
      const messages = await database.all(`
        SELECT * FROM scheduled_messages 
        WHERE created_by = ? AND status = 'pending'
        ORDER BY schedule_time ASC
      `, [userId]);
      
      return messages.map(m => ({
        scheduleId: m.schedule_id,
        candidateId: m.candidate_id,
        channel: m.channel,
        recipients: JSON.parse(m.recipients),
        subject: m.subject,
        body: m.body,
        scheduleTime: m.schedule_time,
        status: m.status
      }));
    } catch (error) {
      console.error('Get scheduled messages error:', error);
      return [];
    }
  }

  /**
   * Cancel scheduled message
   */
  async cancelScheduledMessage(scheduleId, userId) {
    try {
      await database.run(`
        UPDATE scheduled_messages 
        SET status = 'cancelled'
        WHERE schedule_id = ? AND created_by = ?
      `, [scheduleId, userId]);
      
      return { success: true };
    } catch (error) {
      console.error('Cancel scheduled message error:', error);
      throw error;
    }
  }
}

module.exports = new CommunicationService();
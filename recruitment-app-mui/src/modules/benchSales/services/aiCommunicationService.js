// recruitment-app-mui/src/modules/benchSales/services/aiCommunicationService.js

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const GPT_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

class AICommunicationService {
  constructor() {
    this.channelConfigs = {
      email: {
        endpoint: '/communication/email',
        requiredFields: ['email'],
        maxAttachments: 10
      },
      whatsapp: {
        endpoint: '/communication/whatsapp',
        requiredFields: ['phone'],
        maxAttachments: 5
      },
      teams: {
        endpoint: '/communication/teams',
        requiredFields: ['email'],
        maxAttachments: 10
      },
      sms: {
        endpoint: '/communication/sms',
        requiredFields: ['phone'],
        maxAttachments: 0
      },
      phone: {
        endpoint: '/communication/phone',
        requiredFields: ['phone'],
        maxAttachments: 0
      }
    };
  }

  /**
   * Generate message content using GPT
   */
  async generateMessage({ prompt, context, channel, recipientType, candidateStatus, template }) {
    try {
      // Build the GPT prompt
      const systemPrompt = `You are an AI assistant helping recruiters communicate with candidates and referrers. 
        Generate professional, personalized messages based on the context provided.
        Channel: ${channel}
        Recipient Type: ${recipientType}
        Candidate Status: ${candidateStatus}
        
        Context:
        ${context}
        
        Guidelines:
        - Be professional yet friendly
        - Keep ${channel === 'sms' ? 'very brief (under 160 chars)' : channel === 'whatsapp' ? 'concise' : 'detailed'}
        - Include relevant candidate details naturally
        - For referrers, focus on candidate progress and value
        - For candidates, focus on opportunity and next steps`;

      const userPrompt = template ? 
        `Generate a ${template} message` : 
        prompt || 'Generate an appropriate message based on the context';

      // Call GPT API (or your backend endpoint that calls GPT)
      const response = await fetch(`${API_BASE}/ai/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GPT_API_KEY}`
        },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          channel,
          maxTokens: channel === 'sms' ? 50 : 500
        })
      });

      if (!response.ok) {
        // Fallback to template-based generation
        return this.generateFromTemplate(template, context, channel);
      }

      const data = await response.json();
      return {
        subject: data.subject || this.generateSubject(template, context),
        body: data.body || data.message
      };

    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback to template-based generation
      return this.generateFromTemplate(template, context, channel);
    }
  }

  /**
   * Fallback template-based message generation
   */
  generateFromTemplate(templateId, context, channel) {
    const templates = {
      intro: {
        subject: 'Exciting Opportunity - Perfect Match for Your Skills',
        body: `Dear {{candidate_name}},

I came across your profile and was impressed by your experience with {{candidate_skills}}. 

We have an exciting opportunity that aligns perfectly with your background. The position offers:
- Competitive compensation
- Great work environment
- Growth opportunities

I'd love to discuss this opportunity with you. Are you available for a brief call this week?

Best regards,
{{recruiter_name}}`
      },
      interview: {
        subject: 'Interview Invitation - Next Steps',
        body: `Hi {{candidate_name}},

Great news! The client would like to schedule an interview with you.

Available slots:
- Option 1: [Date/Time]
- Option 2: [Date/Time]
- Option 3: [Date/Time]

Please let me know which works best for you.

Thanks,
{{recruiter_name}}`
      },
      placement: {
        subject: 'Congratulations on Your New Position!',
        body: `Dear {{candidate_name}},

Congratulations on your successful placement! 

We're thrilled to have been part of your journey. If you need any support during your transition, please don't hesitate to reach out.

Wishing you great success in your new role!

Best regards,
{{recruiter_name}}`
      },
      'referrer-update': {
        subject: 'Update on {{candidate_name}}',
        body: `Hi {{referrer_name}},

Thank you for referring {{candidate_name}}. I wanted to update you on their progress:

Current Status: {{candidate_status}}
Recent Activity: [Update details]

We appreciate your referral and will keep you posted on further developments.

Best regards,
{{recruiter_name}}`
      }
    };

    const template = templates[templateId] || templates.intro;
    
    // Parse context and replace variables
    const contextLines = context.split('\n');
    const contextMap = {};
    contextLines.forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        contextMap[key.toLowerCase().replace(/\s+/g, '_')] = value;
      }
    });

    let body = template.body;
    let subject = template.subject;

    // Replace variables
    body = body.replace(/\{\{candidate_name\}\}/g, contextMap.candidate || 'Candidate');
    body = body.replace(/\{\{candidate_skills\}\}/g, contextMap.skills || 'your skills');
    body = body.replace(/\{\{candidate_status\}\}/g, contextMap.status || 'Active');
    body = body.replace(/\{\{referrer_name\}\}/g, contextMap.referred_by || 'Referrer');
    body = body.replace(/\{\{recruiter_name\}\}/g, 'Recruitment Team');

    subject = subject.replace(/\{\{candidate_name\}\}/g, contextMap.candidate || 'Candidate');

    // Adjust for channel
    if (channel === 'whatsapp' || channel === 'sms') {
      body = body.replace(/Dear |Hi |Best regards,\n/g, '').trim();
      return { subject: '', body: body.substring(0, channel === 'sms' ? 160 : 4096) };
    }

    return { subject, body };
  }

  /**
   * Send message through specified channel
   */
  async sendMessage({ candidateId, channel, recipients, subject, body, attachments = [] }) {
    try {
      const config = this.channelConfigs[channel];
      
      // Validate recipients have required fields
      for (const recipient of recipients) {
        const missingFields = config.requiredFields.filter(
          field => !recipient[field]
        );
        if (missingFields.length > 0) {
          throw new Error(`Missing ${missingFields.join(', ')} for ${recipient.name}`);
        }
      }

      // Prepare request based on channel
      const requestBody = {
        candidateId,
        recipients,
        subject,
        body,
        attachments: attachments.slice(0, config.maxAttachments)
      };

      // Send through appropriate channel
      const response = await fetch(`${API_BASE}${config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Log the communication
      await this.logCommunication({
        candidateId,
        channel,
        recipients,
        subject,
        body,
        status: 'sent',
        sentAt: new Date().toISOString()
      });

      return { success: true, messageId: data.messageId };

    } catch (error) {
      console.error('Send message error:', error);
      
      // Try alternative sending method
      if (channel === 'email') {
        return this.sendViaMailto({ recipients, subject, body });
      }
      
      throw error;
    }
  }

  /**
   * Fallback email sending via mailto
   */
  sendViaMailto({ recipients, subject, body }) {
    const to = recipients.map(r => r.email).join(',');
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
    return { success: true, method: 'mailto' };
  }

  /**
   * Schedule a message for later
   */
  async scheduleMessage({ candidateId, channel, recipients, subject, body, scheduleTime }) {
    try {
      const response = await fetch(`${API_BASE}/communication/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId,
          channel,
          recipients,
          subject,
          body,
          scheduleTime
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule message');
      }

      return { success: true, scheduleId: data.scheduleId };
    } catch (error) {
      console.error('Schedule message error:', error);
      throw error;
    }
  }

  /**
   * Get message history for a candidate
   */
  async getMessageHistory(candidateId) {
    try {
      const response = await fetch(`${API_BASE}/communication/history/${candidateId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch message history');
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Get history error:', error);
      // Return mock data for development
      return this.getMockHistory();
    }
  }

  /**
   * Get available templates
   */
  async getTemplates() {
    try {
      const response = await fetch(`${API_BASE}/communication/templates`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Get templates error:', error);
      return [];
    }
  }

  /**
   * Check channel availability and configuration
   */
  async checkChannelStatus() {
    try {
      const response = await fetch(`${API_BASE}/communication/channels/status`);
      
      if (!response.ok) {
        throw new Error('Failed to check channel status');
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Check channel status error:', error);
      // Return default status
      return {
        email: { available: true, configured: true },
        whatsapp: { available: true, configured: false },
        teams: { available: true, configured: false },
        phone: { available: true, configured: false },
        sms: { available: true, configured: false }
      };
    }
  }

  /**
   * Log communication activity
   */
  async logCommunication(activity) {
    try {
      await fetch(`${API_BASE}/communication/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activity)
      });
    } catch (error) {
      console.error('Log communication error:', error);
    }
  }

  /**
   * Generate subject line
   */
  generateSubject(template, context) {
    const subjects = {
      intro: 'Exciting Opportunity for You',
      interview: 'Interview Invitation',
      followup: 'Following Up on Your Application',
      placement: 'Congratulations!',
      'referrer-update': 'Candidate Update',
      documents: 'Document Request',
      rejection: 'Application Update',
      reactivation: 'New Opportunities Available'
    };
    return subjects[template] || 'Important Update';
  }

  /**
   * Mock history for development
   */
  getMockHistory() {
    return [
      {
        id: 1,
        channel: 'email',
        subject: 'Introduction - Great Opportunity',
        body: 'Hi, I wanted to reach out about an exciting opportunity...',
        recipients: [{ name: 'John Doe', email: 'john@example.com' }],
        status: 'sent',
        sentAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 2,
        channel: 'whatsapp',
        subject: '',
        body: 'Quick update on your application...',
        recipients: [{ name: 'John Doe', phone: '+1234567890' }],
        status: 'sent',
        sentAt: new Date(Date.now() - 172800000).toISOString()
      }
    ];
  }
}

export default new AICommunicationService();
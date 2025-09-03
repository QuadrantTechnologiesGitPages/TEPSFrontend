// recruitment-backend/services/emailService.js - MAILTO VERSION
const database = require('../utils/database');

class EmailService {
  /**
   * Generate mailto link for sending form to candidate
   */
  generateFormMailtoLink(formData) {
    const {
      token,
      candidateEmail,
      candidateName,
      senderName,
      templateName
    } = formData;

    // Generate form URL
    const formUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate-form/${token}`;
    
    // Create email content
    const subject = encodeURIComponent('📝 Action Required: Please Complete Your Information');
    
    const body = encodeURIComponent(
`Dear ${candidateName || 'Candidate'},

Thank you for your interest in opportunities with our organization.

To proceed with your application, we need you to complete a brief information form. This will help us better understand your qualifications and match you with suitable positions.

Please click the following link to complete your form:
${formUrl}

What to expect:
- Time Required: Approximately 5-10 minutes
- Valid Until: 14 days from today
- Auto-Save: Your progress is automatically saved

If you have any issues accessing the form, please let me know.

Best regards,
${senderName || 'Recruitment Team'}

---
Note: This form link is unique to you and will expire in 14 days.`
    );

    // Generate mailto link
    const mailtoLink = `mailto:${candidateEmail}?subject=${subject}&body=${body}`;
    
    return {
      mailtoLink,
      formUrl,
      candidateEmail
    };
  }

  /**
   * Generate email content for copying to clipboard
   */
  generateFormEmailContent(formData) {
    const {
      token,
      candidateEmail,
      candidateName,
      senderName,
      templateName
    } = formData;

    const formUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate-form/${token}`;
    
    return {
      to: candidateEmail,
      subject: '📝 Action Required: Please Complete Your Information',
      body: `Dear ${candidateName || 'Candidate'},

Thank you for your interest in opportunities with our organization.

To proceed with your application, we need you to complete a brief information form. This will help us better understand your qualifications and match you with suitable positions.

Please click the following link to complete your form:
${formUrl}

What to expect:
- Time Required: Approximately 5-10 minutes
- Valid Until: 14 days from today  
- Auto-Save: Your progress is automatically saved

If you have any issues accessing the form, please let me know.

Best regards,
${senderName || 'Recruitment Team'}

---
Note: This form link is unique to you and will expire in 14 days.`,
      formUrl
    };
  }

  /**
   * Open email client with pre-filled form invitation
   * This returns the data needed for frontend to open mailto
   */
  async prepareFormEmail(data) {
    try {
      const {
        token,
        candidateEmail,
        candidateName,
        senderEmail,
        senderName
      } = data;

      // Update form status to 'sent'
      await database.updateFormStatus(token, 'sent');
      
      // Log activity
      await database.logActivity(
        null,
        token,
        'email_prepared',
        `Form email prepared for ${candidateEmail}`,
        senderEmail
      );

      // Generate mailto link and content
      const mailtoData = this.generateFormMailtoLink(data);
      const emailContent = this.generateFormEmailContent(data);
      
      return {
        success: true,
        mailtoLink: mailtoData.mailtoLink,
        emailContent,
        message: 'Email prepared. Opening email client...'
      };
    } catch (error) {
      console.error('Error preparing email:', error);
      throw error;
    }
  }

  /**
   * Generate copy-paste friendly email template
   */
  generateEmailTemplate(formData) {
    const content = this.generateFormEmailContent(formData);
    
    return {
      ...content,
      instructions: 'Copy this email content and paste it in your email client',
      alternativeActions: {
        copyToClipboard: true,
        openOutlook: true,
        openGmail: true
      }
    };
  }

  /**
   * Track email sent (manually confirmed by user)
   */
  async confirmEmailSent(token, senderEmail) {
    try {
      await database.updateFormStatus(token, 'sent');
      
      await database.logActivity(
        null,
        token,
        'email_sent_confirmed',
        `Email sent confirmed by user`,
        senderEmail
      );
      
      return {
        success: true,
        message: 'Email marked as sent'
      };
    } catch (error) {
      console.error('Error confirming email sent:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
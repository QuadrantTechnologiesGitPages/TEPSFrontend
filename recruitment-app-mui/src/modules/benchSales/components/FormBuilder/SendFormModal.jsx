// src/modules/benchSales/components/FormBuilder/SendFormModal.jsx
import React, { useState, useEffect } from 'react';
import { FormSubmission } from '../../models/formTemplateModel';
import emailjs from '@emailjs/browser';

// You'll need to sign up at EmailJS and get these values
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

const SendFormModal = ({ caseData, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const storedTemplates = JSON.parse(localStorage.getItem('formTemplates') || '[]');
    setTemplates(storedTemplates);
    if (storedTemplates.length > 0) {
      setSelectedTemplate(storedTemplates[0].id);
    }
    
    // Initialize EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }, []);

  useEffect(() => {
    if (caseData && selectedTemplate) {
      const formUrl = `${window.location.origin}/candidate-form/`;
      setEmailBody(`
Dear ${caseData.name},

We need you to complete your profile information for our records. 
Please click the link below to fill out the required information:

[FORM_LINK]

This link will expire in 7 days. Please complete it at your earliest convenience.

Best regards,
Quadrant Technologies
      `);
    }
  }, [caseData, selectedTemplate]);

  const handleSend = async () => {
    setSending(true);
    
    try {
      // Create form submission record
      const submission = new FormSubmission({
        caseId: caseData.caseId,
        templateId: selectedTemplate,
        candidateEmail: caseData.email
      });
      
      // Store submission
      const submissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]');
      submissions.push(submission);
      localStorage.setItem('formSubmissions', JSON.stringify(submissions));
      
      // Generate form URL
      const formUrl = `${window.location.origin}/candidate-form/${submission.token}`;
      
      // Send email using EmailJS
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: caseData.email,
        to_name: caseData.name,
        form_link: formUrl,
        message: emailBody.replace('[FORM_LINK]', formUrl)
      });
      
      alert('Form link sent successfully!');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Send Information Form to Candidate</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Recipient</label>
            <input type="text" value={`${caseData.name} (${caseData.email})`} disabled />
          </div>

          <div className="form-group">
            <label>Select Form Template</label>
            <select 
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Email Message</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows="10"
            />
          </div>

          <div className="info-box">
            <p>📧 The candidate will receive an email with a secure link to fill the form.</p>
            <p>⏰ The link will expire in 7 days.</p>
            <p>✅ You'll be notified when the form is completed.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={handleSend}
            disabled={sending || !selectedTemplate}
          >
            {sending ? 'Sending...' : 'Send Form'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendFormModal;
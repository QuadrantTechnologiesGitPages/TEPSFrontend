// src/modules/benchSales/components/FormDesigner/EmailComposer.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import formService from '../../services/formService';

const EmailComposer = ({ template, candidate, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailContent, setEmailContent] = useState(null);
  const [formUrl, setFormUrl] = useState('');
  const [mailtoLink, setMailtoLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    generateFormAndEmail();
  }, []);

const generateFormAndEmail = async () => {
  setIsLoading(true);
  try {
    const data = await formService.sendForm({
      templateId: template.id || 1,
      candidateEmail: candidate.email,
      candidateName: candidate.name || candidate.email.split('@')[0],
      caseId: candidate.caseId
    });
    
    if (data.success) {
      setEmailContent(data.emailContent);
      setFormUrl(data.formUrl);
      setMailtoLink(data.mailtoLink);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    toast.error('Failed to generate form: ' + error.message);
    onClose();
  } finally {
    setIsLoading(false);
  }
};

  const openEmailClient = () => {
    window.location.href = mailtoLink;
    toast.success('Opening email client...');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const openInOutlook = () => {
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(emailContent.to)}&subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;
    window.open(outlookUrl, '_blank');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const openInGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailContent.to)}&su=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;
    window.open(gmailUrl, '_blank');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const copyToClipboard = async () => {
    const textToCopy = `To: ${emailContent.to}\nSubject: ${emailContent.subject}\n\n${emailContent.body}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const copyFormLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      toast.success('Form link copied!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  if (isLoading) {
    return (
      <div className="email-composer-modal">
        <div className="modal-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Generating form and email...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="email-composer-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>📧 Send Form to Candidate</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {emailContent && (
          <>
            <div className="email-preview">
              <div className="email-field">
                <label>To:</label>
                <div className="field-value">{emailContent.to}</div>
              </div>
              
              <div className="email-field">
                <label>Subject:</label>
                <div className="field-value">{emailContent.subject}</div>
              </div>
              
              <div className="email-field">
                <label>Form Link:</label>
                <div className="field-value link-field">
                  <a href={formUrl} target="_blank" rel="noopener noreferrer">
                    {formUrl}
                  </a>
                  <button onClick={copyFormLink} className="btn-copy-link">
                    📋 Copy Link
                  </button>
                </div>
              </div>
              
              <div className="email-field">
                <label>Message:</label>
                <div className="email-body">
                  <pre>{emailContent.body}</pre>
                </div>
              </div>
            </div>

            <div className="email-actions">
              <h3>Choose how to send:</h3>
              
              <div className="action-buttons">
                <button 
                  className="btn-primary"
                  onClick={openEmailClient}
                  title="Opens your default email client"
                >
                  📧 Open Default Email Client
                </button>
                
                <button 
                  className="btn-outlook"
                  onClick={openInOutlook}
                  title="Opens Outlook Web"
                >
                  <img src="https://img.icons8.com/color/24/microsoft-outlook-2019.png" alt="Outlook"/>
                  Open in Outlook
                </button>
                
                <button 
                  className="btn-gmail"
                  onClick={openInGmail}
                  title="Opens Gmail"
                >
                  <img src="https://img.icons8.com/color/24/gmail-new.png" alt="Gmail"/>
                  Open in Gmail
                </button>
                
                <button 
                  className={`btn-copy ${copySuccess ? 'success' : ''}`}
                  onClick={copyToClipboard}
                >
                  {copySuccess ? '✅ Copied!' : '📋 Copy to Clipboard'}
                </button>
              </div>

              <div className="alternative-options">
                <p className="info-text">
                  💡 Tip: The email will open with the content pre-filled. 
                  You can edit it before sending.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailComposer;
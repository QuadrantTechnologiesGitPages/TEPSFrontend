import React, { useState, useEffect } from 'react';
import { generateMessage } from '../../utils/messageTemplates.js';

const MessageComposer = ({ isOpen, onClose, type, candidate }) => {
  const [channel, setChannel] = useState('email');
  const [message, setMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (candidate && type) {
      const generatedMessage = generateMessage(type, candidate);
      setMessage(generatedMessage);
    }
  }, [candidate, type]);

  if (!isOpen || !candidate) return null;

  const handleSend = () => {
    if (channel === 'email') {
      const subject = type === 'referrer' 
        ? `Update on ${candidate.name}'s Application`
        : `Exciting Opportunity - ${candidate.skills[0]} Position`;
      
      const mailtoLink = `mailto:${type === 'referrer' ? 'referrer@example.com' : candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.open(mailtoLink);
    } else if (channel === 'whatsapp') {
      const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappLink);
    } else if (channel === 'teams') {
      // For Teams, you would integrate with Teams API
      alert('Teams integration will open Microsoft Teams with the message');
    }

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onClose();
    }, 2000);
  };

  const recipientName = type === 'referrer' ? candidate.referredBy : candidate.name;
  const recipientTitle = type === 'referrer' ? 'Referrer' : 'Candidate';

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">
              Send Message to {recipientName} ({recipientTitle})
            </h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="channel-selector">
              <button 
                className={`channel-btn ${channel === 'email' ? 'active' : ''}`}
                onClick={() => setChannel('email')}
              >
                📧 Email
              </button>
              <button 
                className={`channel-btn ${channel === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setChannel('whatsapp')}
              >
                💬 WhatsApp
              </button>
              <button 
                className={`channel-btn ${channel === 'teams' ? 'active' : ''}`}
                onClick={() => setChannel('teams')}
              >
                👥 Teams
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2d3748' }}>
                Message Content
              </label>
              <textarea
                className="message-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
              />
            </div>

            <div style={{ marginTop: '15px', padding: '12px', background: '#f7fafc', borderRadius: '8px' }}>
              <p style={{ fontSize: '13px', color: '#718096' }}>
                💡 <strong>Tip:</strong> The message has been pre-filled based on the candidate's information and discussion history. 
                Feel free to edit it to add a personal touch!
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSend}>
              Send via {channel === 'email' ? 'Email' : channel === 'whatsapp' ? 'WhatsApp' : 'Teams'}
            </button>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="toast">
          ✓ Message prepared successfully! Opening {channel}...
        </div>
      )}
    </>
  );
};

export default MessageComposer;
// recruitment-app-mui/src/modules/benchSales/components/CandidateManagement/CandidateActions.jsx - NEW FILE

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import candidateService from '../../services/candidateService';
import '../../styles/CandidateManagement.css';

const CandidateActions = ({ 
  candidate, 
  onUpdate, 
  onNavigate,
  showView = true,
  showEdit = true,
  showStatus = true,
  showNote = true,
  showDelete = true,
  showEmail = true,
  showExport = false,
  compact = false,
  position = 'bottom-right'
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newStatus, setNewStatus] = useState(candidate?.status || '');
  const [statusReason, setStatusReason] = useState('');
  const [newNote, setNewNote] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const statusOptions = ['Active', 'Inactive', 'Placed', 'On Hold'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (candidate) {
      setNewStatus(candidate.status);
    }
  }, [candidate]);

  const handleView = () => {
    setShowMenu(false);
    if (onNavigate) {
      onNavigate('candidateView', { candidateId: candidate.id });
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: {
          view: 'candidateView',
          candidateId: candidate.id
        }
      }));
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    if (onNavigate) {
      onNavigate('candidateEdit', { candidateId: candidate.id });
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: {
          view: 'candidateEdit',
          candidateId: candidate.id
        }
      }));
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === candidate.status) {
      toast.error('Please select a different status');
      return;
    }

    setUpdating(true);
    try {
      await candidateService.updateCandidateStatus(candidate.id, newStatus, statusReason);
      toast.success('Status updated successfully');
      setShowStatusModal(false);
      setStatusReason('');
      setShowMenu(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setUpdating(true);
    try {
      await candidateService.addNote(candidate.id, newNote);
      toast.success('Note added successfully');
      setShowNoteModal(false);
      setNewNote('');
      setShowMenu(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!window.confirm(`Are you sure you want to delete ${candidate.name}?`)) return;

    try {
      await candidateService.deleteCandidate(candidate.id);
      toast.success('Candidate deleted successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to delete candidate');
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailBody);
    window.open(`mailto:${candidate.email}?subject=${subject}&body=${body}`);
    setShowEmailModal(false);
    setEmailSubject('');
    setEmailBody('');
    setShowMenu(false);
    toast.success('Email client opened');
  };

  const handleExport = async () => {
    setShowMenu(false);
    try {
      // Export single candidate data
      const candidateData = await candidateService.getCandidateById(candidate.id);
      const dataStr = JSON.stringify(candidateData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `candidate-${candidate.name.replace(/\s+/g, '-')}-${candidate.id}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Candidate data exported');
    } catch (error) {
      toast.error('Failed to export candidate data');
    }
  };

  const handleCopyInfo = () => {
    const info = `
Name: ${candidate.name}
Email: ${candidate.email}
Phone: ${candidate.phone || 'N/A'}
Location: ${candidate.current_location || 'N/A'}
Visa Status: ${candidate.visa_status || 'N/A'}
Status: ${candidate.status}
    `.trim();
    
    navigator.clipboard.writeText(info);
    toast.success('Candidate info copied to clipboard');
    setShowMenu(false);
  };

  if (!candidate) return null;

  // Compact mode - just icons
  if (compact) {
    return (
      <div className="candidate-actions-compact">
        {showView && (
          <button
            className="action-icon-btn"
            title="View"
            onClick={handleView}
          >
            👁️
          </button>
        )}
        {showEdit && (
          <button
            className="action-icon-btn"
            title="Edit"
            onClick={handleEdit}
          >
            ✏️
          </button>
        )}
        {showDelete && (
          <button
            className="action-icon-btn delete"
            title="Delete"
            onClick={handleDelete}
          >
            🗑️
          </button>
        )}
      </div>
    );
  }

  // Full dropdown menu mode
  return (
    <>
      <div className="candidate-actions-container">
        <button
          ref={buttonRef}
          className="actions-menu-btn"
          onClick={() => setShowMenu(!showMenu)}
        >
          ⋮
        </button>
        
        {showMenu && (
          <div 
            ref={menuRef}
            className={`actions-dropdown ${position}`}
          >
            {showView && (
              <button className="action-item" onClick={handleView}>
                <span className="action-icon">👁️</span>
                <span>View Profile</span>
              </button>
            )}
            
            {showEdit && (
              <button className="action-item" onClick={handleEdit}>
                <span className="action-icon">✏️</span>
                <span>Edit</span>
              </button>
            )}
            
            {showStatus && (
              <button 
                className="action-item" 
                onClick={() => {
                  setShowStatusModal(true);
                  setShowMenu(false);
                }}
              >
                <span className="action-icon">🔄</span>
                <span>Change Status</span>
              </button>
            )}
            
            {showNote && (
              <button 
                className="action-item" 
                onClick={() => {
                  setShowNoteModal(true);
                  setShowMenu(false);
                }}
              >
                <span className="action-icon">📝</span>
                <span>Add Note</span>
              </button>
            )}
            
            {showEmail && candidate.email && (
              <button 
                className="action-item" 
                onClick={() => {
                  setShowEmailModal(true);
                  setShowMenu(false);
                }}
              >
                <span className="action-icon">📧</span>
                <span>Send Email</span>
              </button>
            )}
            
            <button className="action-item" onClick={handleCopyInfo}>
              <span className="action-icon">📋</span>
              <span>Copy Info</span>
            </button>
            
            {showExport && (
              <button className="action-item" onClick={handleExport}>
                <span className="action-icon">📥</span>
                <span>Export Data</span>
              </button>
            )}
            
            {showDelete && (
              <>
                <div className="action-divider"></div>
                <button className="action-item delete" onClick={handleDelete}>
                  <span className="action-icon">🗑️</span>
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => !updating && setShowStatusModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Status - {candidate.name}</h3>
              <button className="close-btn" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Current Status</label>
                <p><strong>{candidate.status}</strong></p>
              </div>
              <div className="form-group">
                <label>New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={updating}
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reason (Optional)</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows="2"
                  placeholder="Enter reason..."
                  disabled={updating}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === candidate.status}
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => !updating && setShowNoteModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Note - {candidate.name}</h3>
              <button className="close-btn" onClick={() => setShowNoteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows="4"
                  placeholder="Enter your note..."
                  disabled={updating}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowNoteModal(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleAddNote}
                disabled={updating || !newNote.trim()}
              >
                {updating ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Email to {candidate.name}</h3>
              <button className="close-btn" onClick={() => setShowEmailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>To</label>
                <input
                  type="text"
                  value={candidate.email}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter subject..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows="6"
                  placeholder="Enter your message..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowEmailModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleSendEmail}
              >
                Open Email Client
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CandidateActions;
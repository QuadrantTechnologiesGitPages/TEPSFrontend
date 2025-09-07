// recruitment-app-mui/src/modules/benchSales/components/CandidateManagement/CandidateView.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import candidateService from '../../services/candidateService';
import '../../styles/CandidateManagement.css';

const CandidateView = ({ candidateId, onNavigate }) => {
  const [candidate, setCandidate] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [newNote, setNewNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const statusOptions = ['Active', 'Inactive', 'Placed', 'On Hold'];

  useEffect(() => {
    if (candidateId) {
      fetchCandidateData();
      fetchActivities();
    }
  }, [candidateId]);

  const fetchCandidateData = async () => {
    setLoading(true);
    try {
      const data = await candidateService.getCandidateById(candidateId);
      const candidateData = data.candidate || data;
      
      // Parse skills if string
      if (typeof candidateData.skills === 'string') {
        try {
          candidateData.skills = JSON.parse(candidateData.skills);
        } catch {
          candidateData.skills = candidateData.skills.split(',').map(s => s.trim());
        }
      }
      
      setCandidate(candidateData);
      setNewStatus(candidateData.status);
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate data');
      handleBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const data = await candidateService.getCandidateActivities(candidateId);
      setActivities(data.activities || data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('candidateList');
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { view: 'candidateList' }
      }));
    }
  };

  const handleEdit = () => {
    if (onNavigate) {
      onNavigate('candidateEdit', { candidateId });
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: {
          view: 'candidateEdit',
          candidateId
        }
      }));
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === candidate.status) {
      toast.error('Please select a different status');
      return;
    }

    setUpdatingStatus(true);
    try {
      await candidateService.updateCandidateStatus(candidateId, newStatus, statusReason);
      toast.success('Status updated successfully');
      setShowStatusModal(false);
      setStatusReason('');
      fetchCandidateData();
      fetchActivities();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setAddingNote(true);
    try {
      await candidateService.addNote(candidateId, newNote);
      toast.success('Note added successfully');
      setShowNoteModal(false);
      setNewNote('');
      fetchActivities();
      fetchCandidateData();
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;

    try {
      await candidateService.deleteCandidate(candidateId);
      toast.success('Candidate deleted successfully');
      handleBack();
    } catch (error) {
      toast.error('Failed to delete candidate');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      'Active': 'badge-success',
      'Inactive': 'badge-secondary',
      'Placed': 'badge-info',
      'On Hold': 'badge-warning'
    };
    return `badge ${classes[status] || 'badge-secondary'}`;
  };

  const getVisaBadgeClass = (visa) => {
    const classes = {
      'H1B': 'badge-primary',
      'OPT-EAD': 'badge-info',
      'GC-EAD': 'badge-success',
      'Green Card': 'badge-success',
      'US Citizen': 'badge-dark'
    };
    return `badge ${classes[visa] || 'badge-secondary'}`;
  };

  const getActivityIcon = (type) => {
    const icons = {
      'created': '🆕',
      'updated': '✏️',
      'status_changed': '🔄',
      'note_added': '📝',
      'email_sent': '📧',
      'submission_received': '📥'
    };
    return icons[type] || '📌';
  };

  if (loading) {
    return (
      <div className="candidate-view-loading">
        <div className="spinner"></div>
        <p>Loading candidate...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="candidate-not-found">
        <p>Candidate not found</p>
        <button onClick={handleBack}>Back to List</button>
      </div>
    );
  }

  return (
    <div className="candidate-view-container">
      {/* Header */}
      <div className="candidate-view-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            ← Back
          </button>
          <h2>{candidate.name}</h2>
          <span className={getStatusBadgeClass(candidate.status)}>
            {candidate.status}
          </span>
          {candidate.visa_status && (
            <span className={getVisaBadgeClass(candidate.visa_status)}>
              {candidate.visa_status}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button className="btn-edit" onClick={handleEdit}>
            ✏️ Edit
          </button>
          <button className="btn-status" onClick={() => setShowStatusModal(true)}>
            🔄 Change Status
          </button>
          <button className="btn-note" onClick={() => setShowNoteModal(true)}>
            📝 Add Note
          </button>
          <button className="btn-delete" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity History ({activities.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'profile' && (
          <div className="profile-content">
            {/* Contact Information */}
            <div className="info-section">
              <h3>Contact Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Email</label>
                  <div className="info-value">
                    <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
                  </div>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <div className="info-value">
                    {candidate.phone ? (
                      <a href={`tel:${candidate.phone}`}>{candidate.phone}</a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
                <div className="info-item">
                  <label>LinkedIn</label>
                  <div className="info-value">
                    {candidate.linkedin_url ? (
                      <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                        View Profile
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
                <div className="info-item">
                  <label>Location</label>
                  <div className="info-value">{candidate.current_location || 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="info-section">
              <h3>Professional Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Years of Experience</label>
                  <div className="info-value">{candidate.years_experience || 'Not provided'}</div>
                </div>
                <div className="info-item">
                  <label>Current Employer</label>
                  <div className="info-value">{candidate.current_employer || 'Not provided'}</div>
                </div>
                <div className="info-item">
                  <label>Education</label>
                  <div className="info-value">{candidate.education || 'Not provided'}</div>
                </div>
                <div className="info-item">
                  <label>Availability</label>
                  <div className="info-value">{candidate.availability || 'Not provided'}</div>
                </div>
                <div className="info-item">
                  <label>Expected Salary</label>
                  <div className="info-value">{candidate.expected_salary || 'Not provided'}</div>
                </div>
                <div className="info-item">
                  <label>Resume</label>
                  <div className="info-value">
                    {candidate.resume_url ? (
                      <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                        View Resume
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="info-section">
              <h3>Technical Skills</h3>
              <div className="skills-display">
                {candidate.skills && candidate.skills.length > 0 ? (
                  candidate.skills.map((skill, index) => (
                    <span key={index} className="skill-badge">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p>No skills listed</p>
                )}
              </div>
            </div>

            {/* Notes */}
            {candidate.notes && (
              <div className="info-section">
                <h3>Notes</h3>
                <div className="notes-content">
                  {candidate.notes}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="info-section">
              <h3>Additional Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Source</label>
                  <div className="info-value">{candidate.source || 'Manual Entry'}</div>
                </div>
                <div className="info-item">
                  <label>Referred By</label>
                  <div className="info-value">{candidate.referred_by || 'Not referred'}</div>
                </div>
                <div className="info-item">
                  <label>Created By</label>
                  <div className="info-value">{candidate.created_by || 'System'}</div>
                </div>
                <div className="info-item">
                  <label>Created Date</label>
                  <div className="info-value">{formatDateShort(candidate.created_at)}</div>
                </div>
                <div className="info-item">
                  <label>Last Updated</label>
                  <div className="info-value">{formatDate(candidate.updated_at)}</div>
                </div>
                <div className="info-item">
                  <label>Updated By</label>
                  <div className="info-value">{candidate.last_updated_by || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-content">
            {activities.length === 0 ? (
              <div className="no-activities">
                <p>No activities recorded</p>
              </div>
            ) : (
              <div className="activity-timeline">
                {activities.map((activity, index) => (
                  <div key={activity.id || index} className="activity-item">
                    <div className="activity-icon">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-header">
                        <strong>{activity.description || activity.activity_type}</strong>
                        <span className="activity-time">
                          {formatDate(activity.performed_at)}
                        </span>
                      </div>
                      <div className="activity-details">
                        <small>By: {activity.performed_by || 'System'}</small>
                        {activity.changes && (
                          <div className="activity-changes">
                            {(() => {
                              try {
                                const changes = typeof activity.changes === 'string' 
                                  ? JSON.parse(activity.changes) 
                                  : activity.changes;
                                return Object.entries(changes).map(([key, value]) => (
                                  <div key={key} className="change-item">
                                    <span className="change-key">{key}:</span>
                                    <span className="change-value">
                                      {typeof value === 'object' ? JSON.stringify(value) : value}
                                    </span>
                                  </div>
                                ));
                              } catch {
                                return <div>{activity.changes}</div>;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => !updatingStatus && setShowStatusModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Candidate Status</h3>
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
                  disabled={updatingStatus}
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reason for Change (Optional)</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows="3"
                  placeholder="Enter reason for status change..."
                  disabled={updatingStatus}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowStatusModal(false)}
                disabled={updatingStatus}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleStatusUpdate}
                disabled={updatingStatus || newStatus === candidate.status}
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => !addingNote && setShowNoteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Note</h3>
              <button className="close-btn" onClick={() => setShowNoteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Note</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows="5"
                  placeholder="Enter your note here..."
                  disabled={addingNote}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowNoteModal(false)}
                disabled={addingNote}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateView;
// src/modules/benchSales/components/CaseManagement/CaseDetails.jsx
import React, { useState, useEffect } from 'react';
import { useCases } from '../../contexts/CaseContext';
import { useAuth } from '../../../../contexts/AuthContext';
import CaseTimeline from './CaseTimeline';
import CaseNotes from './CaseNotes';
import StatusUpdater from './StatusUpdater';
import { CaseStatus, VerificationStatus } from '../../models/caseModel';

const CaseDetails = ({ caseId, onClose }) => {
  const { getCaseById, updateCase, addNoteToCase } = useCases();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    if (caseId) {
      const data = getCaseById(caseId);
      setCaseData(data);
      setEditedData(data);
    }
  }, [caseId]);

  if (!caseData) {
    return <div className="case-details-loading">Loading case details...</div>;
  }

  const handleSave = () => {
    updateCase(caseId, editedData, user);
    setCaseData(editedData);
    setEditMode(false);
  };

  const handleFieldChange = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const getVerificationProgress = () => {
    const checks = ['linkedIn', 'education', 'experience', 'references'];
    const completed = checks.filter(check => 
      caseData.verification?.[check]?.verified
    ).length;
    return (completed / checks.length) * 100;
  };

  const calculateSLAStatus = () => {
    if (!caseData.sla?.deadline) return null;
    const now = new Date();
    const deadline = new Date(caseData.sla.deadline);
    const hoursLeft = Math.floor((deadline - now) / (1000 * 60 * 60));
    
    if (hoursLeft < 0) return { status: 'breached', text: 'SLA Breached' };
    if (hoursLeft < 24) return { status: 'critical', text: `${hoursLeft}h remaining` };
    if (hoursLeft < 72) return { status: 'warning', text: `${Math.floor(hoursLeft/24)}d remaining` };
    return { status: 'normal', text: `${Math.floor(hoursLeft/24)}d remaining` };
  };

  const slaStatus = calculateSLAStatus();

  return (
    <div className="case-details-modal">
      <div className="case-details-container">
        {/* Header */}
        <div className="case-details-header">
          <div className="header-left">
            <h1>{caseData.caseId}</h1>
            <span className={`status-badge ${caseData.status.toLowerCase().replace(' ', '-')}`}>
              {caseData.status}
            </span>
            {slaStatus && (
              <span className={`sla-indicator ${slaStatus.status}`}>
                {slaStatus.text}
              </span>
            )}
          </div>
          <div className="header-right">
            <button onClick={() => setEditMode(!editMode)} className="btn-edit">
              {editMode ? 'Cancel' : 'Edit'}
            </button>
            {editMode && (
              <button onClick={handleSave} className="btn-save">Save</button>
            )}
            <button onClick={onClose} className="btn-close">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="case-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >Overview</button>
          <button 
            className={activeTab === 'verification' ? 'active' : ''}
            onClick={() => setActiveTab('verification')}
          >Verification</button>
          <button 
            className={activeTab === 'timeline' ? 'active' : ''}
            onClick={() => setActiveTab('timeline')}
          >Timeline</button>
          <button 
            className={activeTab === 'notes' ? 'active' : ''}
            onClick={() => setActiveTab('notes')}
          >Notes</button>
        </div>

        {/* Tab Content */}
        <div className="case-details-content">
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="detail-grid">
                <div className="detail-group">
                  <h3>Candidate Information</h3>
                  <div className="detail-item">
                    <label>Name:</label>
                    {editMode ? (
                      <input 
                        value={editedData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                      />
                    ) : (
                      <span>{caseData.name}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{caseData.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{caseData.phone}</span>
                  </div>
                  <div className="detail-item">
                    <label>LinkedIn:</label>
                    <a href={caseData.linkedIn} target="_blank" rel="noopener noreferrer">
                      View Profile
                    </a>
                  </div>
                </div>

                <div className="detail-group">
                  <h3>Professional Details</h3>
                  <div className="detail-item">
                    <label>Experience:</label>
                    <span>{caseData.yearsExp}</span>
                  </div>
                  <div className="detail-item">
                    <label>Visa Status:</label>
                    <span>{caseData.visa}</span>
                  </div>
                  <div className="detail-item">
                    <label>Location:</label>
                    <span>{caseData.location}</span>
                  </div>
                  <div className="detail-item">
                    <label>Skills:</label>
                    <div className="skills-list">
                      {caseData.skills?.map((skill, idx) => (
                        <span key={idx} className="skill-chip">{skill}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="detail-group">
                  <h3>Case Information</h3>
                  <div className="detail-item">
                    <label>Priority:</label>
                    {editMode ? (
                      <select 
                        value={editedData.priority}
                        onChange={(e) => handleFieldChange('priority', parseInt(e.target.value))}
                      >
                        <option value="1">Critical</option>
                        <option value="2">High</option>
                        <option value="3">Medium</option>
                        <option value="4">Low</option>
                      </select>
                    ) : (
                      <span className={`priority-${caseData.priority}`}>
                        {['Critical', 'High', 'Medium', 'Low'][caseData.priority - 1]}
                      </span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>Referred By:</label>
                    <span>{caseData.referredBy}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created Date:</label>
                    <span>{new Date(caseData.createdDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Assigned To:</label>
                    <span>{caseData.assignedTo || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <div className="status-update-section">
                <StatusUpdater 
                  currentStatus={caseData.status}
                  caseId={caseId}
                  onStatusUpdate={(newStatus) => {
                    setCaseData({ ...caseData, status: newStatus });
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="verification-section">
              <div className="verification-progress">
                <h3>Verification Progress</h3>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${getVerificationProgress()}%` }}
                  />
                </div>
                <span className="progress-text">{getVerificationProgress()}% Complete</span>
              </div>

              <div className="verification-checklist">
                {['linkedIn', 'education', 'experience', 'references'].map(check => (
                  <div key={check} className="verification-item">
                    <input 
                      type="checkbox"
                      checked={caseData.verification?.[check]?.verified || false}
                      onChange={(e) => {
                        const updated = { ...caseData };
                        if (!updated.verification) updated.verification = {};
                        if (!updated.verification[check]) updated.verification[check] = {};
                        updated.verification[check].verified = e.target.checked;
                        updated.verification[check].date = new Date().toISOString();
                        updateCase(caseId, updated, user);
                        setCaseData(updated);
                      }}
                    />
                    <label>{check.charAt(0).toUpperCase() + check.slice(1)} Verification</label>
                    {caseData.verification?.[check]?.date && (
                      <span className="verification-date">
                        Verified on {new Date(caseData.verification[check].date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <CaseTimeline activities={caseData.activities || []} />
          )}

          {activeTab === 'notes' && (
            <CaseNotes 
              notes={caseData.notes || []}
              caseId={caseId}
              onAddNote={(note) => {
                addNoteToCase(caseId, note, user);
                setCaseData({
                  ...caseData,
                  notes: [...(caseData.notes || []), {
                    id: Date.now(),
                    content: note,
                    user: user?.email,
                    timestamp: new Date().toISOString()
                  }]
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetails;
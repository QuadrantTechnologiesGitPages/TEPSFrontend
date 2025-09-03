// src/modules/benchSales/components/CaseManagement/StatusUpdater.jsx
import React, { useState } from 'react';
import { useCases } from '../../contexts/CaseContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { CaseStatus } from '../../models/caseModel';

const StatusUpdater = ({ currentStatus, caseId, onStatusUpdate }) => {
  const { updateCase } = useCases();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updateNote, setUpdateNote] = useState('');

  const statusFlow = {
    [CaseStatus.INTAKE]: [CaseStatus.VERIFICATION_PENDING, CaseStatus.ON_HOLD],
    [CaseStatus.VERIFICATION_PENDING]: [CaseStatus.VERIFICATION_IN_PROGRESS, CaseStatus.ON_HOLD],
    [CaseStatus.VERIFICATION_IN_PROGRESS]: [CaseStatus.VERIFIED, CaseStatus.VERIFICATION_PENDING, CaseStatus.ON_HOLD],
    [CaseStatus.VERIFIED]: [CaseStatus.SEARCHING, CaseStatus.ON_HOLD],
    [CaseStatus.SEARCHING]: [CaseStatus.SHORTLISTED, CaseStatus.ON_HOLD],
    [CaseStatus.SHORTLISTED]: [CaseStatus.SUBMITTED, CaseStatus.SEARCHING, CaseStatus.ON_HOLD],
    [CaseStatus.SUBMITTED]: [CaseStatus.PLACED, CaseStatus.SHORTLISTED, CaseStatus.ON_HOLD],
    [CaseStatus.ON_HOLD]: [CaseStatus.INTAKE, CaseStatus.SEARCHING, CaseStatus.CLOSED],
    [CaseStatus.PLACED]: [CaseStatus.CLOSED],
    [CaseStatus.CLOSED]: []
  };

  const getAvailableStatuses = () => {
    return statusFlow[currentStatus] || [];
  };

  const handleStatusChange = () => {
    if (!selectedStatus) return;

    const updates = {
      status: selectedStatus,
      activities: [{
        id: Date.now(),
        type: 'status_change',
        description: `Status changed from ${currentStatus} to ${selectedStatus}. ${updateNote}`,
        user: user?.email,
        timestamp: new Date().toISOString()
      }]
    };

    updateCase(caseId, updates, user);
    if (onStatusUpdate) onStatusUpdate(selectedStatus);
    
    setShowModal(false);
    setSelectedStatus('');
    setUpdateNote('');
  };

  const getStatusColor = (status) => {
    const colors = {
      [CaseStatus.INTAKE]: '#718096',
      [CaseStatus.VERIFICATION_PENDING]: '#f6ad55',
      [CaseStatus.VERIFICATION_IN_PROGRESS]: '#ed8936',
      [CaseStatus.VERIFIED]: '#48bb78',
      [CaseStatus.SEARCHING]: '#4299e1',
      [CaseStatus.SHORTLISTED]: '#667eea',
      [CaseStatus.SUBMITTED]: '#9f7aea',
      [CaseStatus.ON_HOLD]: '#f56565',
      [CaseStatus.PLACED]: '#38b2ac',
      [CaseStatus.CLOSED]: '#a0aec0'
    };
    return colors[status] || '#718096';
  };

  const availableStatuses = getAvailableStatuses();

  return (
    <div className="status-updater">
      <div className="current-status-display">
        <h3>Current Status</h3>
        <div 
          className="status-display"
          style={{ backgroundColor: getStatusColor(currentStatus) }}
        >
          {currentStatus}
        </div>
      </div>

      {availableStatuses.length > 0 && (
        <div className="status-actions">
          <h4>Change Status To:</h4>
          <div className="status-options">
            {availableStatuses.map(status => (
              <button
                key={status}
                className="status-option"
                style={{ borderColor: getStatusColor(status) }}
                onClick={() => {
                  setSelectedStatus(status);
                  setShowModal(true);
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="status-modal">
          <div className="status-modal-content">
            <h3>Confirm Status Change</h3>
            <p>Change status from <strong>{currentStatus}</strong> to <strong>{selectedStatus}</strong>?</p>
            
            <textarea
              placeholder="Add a note about this status change (optional)"
              value={updateNote}
              onChange={(e) => setUpdateNote(e.target.value)}
              rows="3"
            />

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleStatusChange} className="btn-confirm">
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusUpdater;
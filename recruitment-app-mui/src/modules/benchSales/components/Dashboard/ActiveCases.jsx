// src/modules/benchSales/components/Dashboard/ActiveCases.jsx
import React, { useState } from 'react';

const ActiveCases = ({ cases, onRefresh }) => {
  const [expandedCase, setExpandedCase] = useState(null);

  const getPriorityClass = (priority) => {
    if (priority <= 1) return 'priority-high';
    if (priority <= 2) return 'priority-medium';
    return '';
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'Active': 'active',
      'Pending Discussion': 'pending',
      'In Active': 'inactive',
      'Verified': 'verified'
    };
    return statusMap[status] || '';
  };

  const calculateSLA = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const slaDate = new Date(deadline);
    const hoursLeft = Math.floor((slaDate - now) / (1000 * 60 * 60));
    
    if (hoursLeft < 0) return { text: 'Overdue', class: 'overdue' };
    if (hoursLeft < 24) return { text: `${hoursLeft}h left`, class: 'urgent' };
    if (hoursLeft < 72) return { text: `${Math.floor(hoursLeft/24)}d left`, class: 'warning' };
    return { text: `${Math.floor(hoursLeft/24)}d left`, class: 'normal' };
  };

  const handleCaseClick = (caseId) => {
    setExpandedCase(expandedCase === caseId ? null : caseId);
  };

  if (!cases || cases.length === 0) {
    return (
      <div className="active-cases">
        <div className="active-cases-header">
          <h2>Active Cases</h2>
          <button className="refresh-btn" onClick={onRefresh}>
            Refresh
          </button>
        </div>
        <div className="empty-cases">
          <div className="empty-cases-icon">📭</div>
          <p>No active cases at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="active-cases">
      <div className="active-cases-header">
        <h2>Active Cases ({cases.length})</h2>
        <button className="refresh-btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      
      <div className="case-list">
        {cases.map((caseItem) => {
          const sla = calculateSLA(caseItem.slaDeadline);
          const isExpanded = expandedCase === caseItem.caseId;
          
          return (
            <div 
              key={caseItem.caseId}
              className={`case-item ${getPriorityClass(caseItem.priority)}`}
              onClick={() => handleCaseClick(caseItem.caseId)}
            >
              <div className="case-header">
                <div>
                  <span className="case-id">{caseItem.caseId}</span>
                  {sla && (
                    <span className={`sla-badge ${sla.class}`}>
                      {sla.text}
                    </span>
                  )}
                </div>
                <span className={`case-status ${getStatusClass(caseItem.currentStatus)}`}>
                  {caseItem.currentStatus}
                </span>
              </div>
              
              <div className="case-details">
                <strong>{caseItem.name}</strong> - {caseItem.skills.slice(0, 2).join(', ')}
                <div className="case-meta">
                  <span>📍 {caseItem.location}</span>
                  <span>🎫 {caseItem.visa}</span>
                  <span>👤 {caseItem.referredBy}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="case-expanded">
                  <div className="expanded-section">
                    <strong>Last Discussion:</strong>
                    <p>{caseItem.lastDiscussion}</p>
                  </div>
                  <div className="expanded-section">
                    <strong>Verification Status:</strong>
                    <span className={`verification-badge ${caseItem.verificationStatus?.toLowerCase()}`}>
                      {caseItem.verificationStatus || 'Not Started'}
                    </span>
                  </div>
                  <div className="case-actions">
                    <button className="case-action-btn">View Details</button>
                    <button className="case-action-btn">Update Status</button>
                    <button className="case-action-btn">Add Note</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveCases;
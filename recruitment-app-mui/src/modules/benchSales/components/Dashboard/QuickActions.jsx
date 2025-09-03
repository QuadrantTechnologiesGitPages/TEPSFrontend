// src/modules/benchSales/components/Dashboard/QuickActions.jsx
import React from 'react';

const QuickActions = ({ onAction }) => {
  const actions = [
    {
      id: 'newIntake',
      label: 'Design & Send Form',
      icon: '📝',
      primary: true
    },
    {
      id: 'viewResponses', 
      label: 'View Responses',
      icon: '📥',
      primary: true,
      badge: null // Could add count of unread responses
    },
    {
      id: 'searchCandidate',
      label: 'Search Candidates',
      icon: '🔍',
      primary: false
    },
    {
      id: 'viewAllCases',
      label: 'View All Cases',
      icon: '📋',
      primary: false
    },
    {
      id: 'templates',
      label: 'Form Templates',
      icon: '📄',
      primary: false
    },
    {
      id: 'pendingVerifications',
      label: 'Pending Verifications',
      icon: '⏳',
      primary: false
    }
  ];

  return (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="action-buttons">
        {actions.map(action => (
          <button
            key={action.id}
            className={`action-btn ${!action.primary ? 'secondary' : ''}`}
            onClick={() => onAction(action.id)}
          >
            <span style={{ marginRight: '8px' }}>{action.icon}</span>
            {action.label}
            {action.badge && (
              <span className="action-badge">{action.badge}</span>
            )}
          </button>
        ))}
      </div>
      
      <div className="shortcuts-info">
        <h4>Keyboard Shortcuts</h4>
        <div className="shortcut-item">
          <kbd>Alt + N</kbd> New Form
        </div>
        <div className="shortcut-item">
          <kbd>Alt + R</kbd> Responses
        </div>
        <div className="shortcut-item">
          <kbd>Alt + S</kbd> Search
        </div>
        <div className="shortcut-item">
          <kbd>Alt + C</kbd> Cases
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
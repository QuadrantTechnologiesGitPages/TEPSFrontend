// src/modules/benchSales/components/CaseManagement/CaseTimeline.jsx
import React from 'react';

const CaseTimeline = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    const icons = {
      case_created: '🎯',
      status_change: '🔄',
      verification: '✅',
      note_added: '📝',
      document_uploaded: '📎',
      email_sent: '📧',
      submission: '📤'
    };
    return icons[type] || '📌';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  if (activities.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No activities recorded yet</p>
      </div>
    );
  }

  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="case-timeline">
      <h3>Activity Timeline</h3>
      <div className="timeline-list">
        {sortedActivities.map((activity, index) => (
          <div key={activity.id || index} className="timeline-item">
            <div className="timeline-icon">
              {getActivityIcon(activity.type)}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-type">
                  {activity.type?.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="timeline-time">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
              <div className="timeline-description">
                {activity.description}
              </div>
              <div className="timeline-user">
                by {activity.user || 'System'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CaseTimeline;
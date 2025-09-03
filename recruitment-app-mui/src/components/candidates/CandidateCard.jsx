import React from 'react';
import AvailabilityBadge from './AvailabilityBadge.jsx';

const CandidateCard = ({ candidate, onViewDetails, animationDelay }) => {
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div 
      className="candidate-card"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className="candidate-header">
        <div className="candidate-info">
          <div className="avatar">
            {getInitials(candidate.name)}
          </div>
          <div>
            <h3 className="candidate-name">{candidate.name}</h3>
            <div className="candidate-badges">
              <AvailabilityBadge status={candidate.currentStatus} />
              <span className="badge badge-visa">{candidate.visa}</span>
              <span className="badge badge-exp">{candidate.yearsExp}</span>
            </div>
          </div>
        </div>
        <div className="priority-indicator">
          {candidate.priority === 1 && <span className="priority high">High Priority</span>}
          {candidate.priority === 2 && <span className="priority medium">Medium</span>}
        </div>
      </div>

      <div className="candidate-details">
        <div className="detail-row">
          <span className="detail-icon">📍</span>
          <span>{candidate.location}</span>
        </div>
        <div className="detail-row">
          <span className="detail-icon">👥</span>
          <span>Referred by: <strong>{candidate.referredBy}</strong></span>
        </div>
        <div className="detail-row">
          <span className="detail-icon">💼</span>
          <span>{candidate.engagement} • {candidate.vertical}</span>
        </div>
      </div>

      <div className="skills-container">
        <h4 className="skills-label">Key Skills:</h4>
        <div className="skills">
          {candidate.skills.slice(0, 4).map((skill, index) => (
            <span key={index} className="skill-chip">{skill}</span>
          ))}
          {candidate.skills.length > 4 && (
            <span className="skill-chip more">+{candidate.skills.length - 4} more</span>
          )}
        </div>
      </div>

      <div className="last-discussion">
        <p className="discussion-label">Last Discussion:</p>
        <p className="discussion-text">{candidate.lastDiscussion}</p>
      </div>

      <div className="card-actions">
        <button 
          className="btn btn-primary"
          onClick={() => onViewDetails(candidate)}
        >
          View Full Details
        </button>
      </div>
    </div>
  );
};

export default CandidateCard;
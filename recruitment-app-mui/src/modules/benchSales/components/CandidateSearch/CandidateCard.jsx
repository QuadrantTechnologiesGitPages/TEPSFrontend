import React from 'react';

const CandidateCard = ({ candidate, rank, onAction, searchMode }) => {
    // Calculate match percentage
  const getMatchPercentage = () => {
    if (candidate.rerankerScore) {
      // Semantic reranker score (usually 0-4)
      return Math.min(100, Math.round((candidate.rerankerScore / 4) * 100));
    } else if (candidate.score) {
      // Regular score (usually 0-1)
      return Math.round(candidate.score * 100);
    }
    return 0;
  };

  const matchPercentage = getMatchPercentage();
  
    const getScoreColor = (score) => {
    if (score > 0.8) return '#22c55e';
    if (score > 0.6) return '#3b82f6';
    if (score > 0.4) return '#f59e0b';
    return '#6b7280';
  };

  const formatScore = (score) => {
    if (typeof score === 'number') {
      return Math.round(score * 100);
    }
    return 0;
  };

  return (
    <div className="ai-candidate-card">
      <div className="card-header">
        <div className="rank-badge">#{rank}</div>
        <div className="candidate-info">
          <h4 className="candidate-name">{candidate.fullName || 'Unknown'}</h4>
          <p className="candidate-email">{candidate.email}</p>
        </div>
        <div className="match-score" style={{ color: getScoreColor(matchPercentage) }}>
          <span className="score-value">{matchPercentage}%</span>
          <span className="score-label">Match</span>
        </div>
        {searchMode === 'jd' && candidate.totalScore !== undefined && (
          <div className="match-score" style={{ color: getScoreColor(candidate.totalScore) }}>
            <span className="score-value">{formatScore(candidate.totalScore)}%</span>
            <span className="score-label">Match</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="candidate-details">
          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <span>{candidate.currentLocation || 'Not specified'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💼</span>
            <span>{candidate.yearsOfExperience || 0} years experience</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">📋</span>
            <span>{candidate.visaStatus || 'Not specified'}</span>
          </div>
        </div>

        {candidate.skills && candidate.skills.length > 0 && (
          <div className="candidate-skills">
            <h5>Skills:</h5>
            <div className="skill-chips">
              {candidate.skills.slice(0, 5).map((skill, idx) => (
                <span key={idx} className="skill-chip">{skill}</span>
              ))}
              {candidate.skills.length > 5 && (
                <span className="skill-chip more">+{candidate.skills.length - 5}</span>
              )}
            </div>
          </div>
        )}

        {candidate.matchReasons && candidate.matchReasons.length > 0 && (
          <div className="match-reasons">
            <h5>Why matched:</h5>
            <ul className="reason-list">
              {candidate.matchReasons.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="reason-item">{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {candidate.resumeText && (
          <div className="resume-preview">
            <p className="preview-text">
              {candidate.resumeText.substring(0, 150)}...
            </p>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button 
          className="action-btn view-btn"
          onClick={() => onAction(candidate, 'view')}
        >
          View Details
        </button>
        <button 
          className="action-btn contact-btn"
          onClick={() => onAction(candidate, 'contact')}
        >
          Contact
        </button>
        <button 
          className="action-btn shortlist-btn"
          onClick={() => onAction(candidate, 'shortlist')}
        >
          Shortlist
        </button>
      </div>
    </div>
  );
};

export default CandidateCard;
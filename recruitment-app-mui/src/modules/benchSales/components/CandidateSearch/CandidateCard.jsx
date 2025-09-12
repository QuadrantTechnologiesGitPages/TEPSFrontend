// recruitment-app-mui/src/modules/benchSales/components/CandidateSearch/CandidateCard.jsx
import React from 'react';

const CandidateCard = ({ candidate, rank, onAction, searchMode }) => {
    // 🔥 FIX: Calculate match percentage properly for semantic search
    const getMatchPercentage = () => {
        // If we have a semantic reranker score (0-4 scale)
        if (candidate.rerankerScore !== undefined && candidate.rerankerScore !== null) {
            // Convert 0-4 scale to percentage
            return Math.round((candidate.rerankerScore / 4) * 100);
        } 
        // If we have a total score (0-1 scale)
        else if (candidate.totalScore !== undefined && candidate.totalScore !== null) {
            return Math.round(candidate.totalScore * 100);
        }
        // If we have a regular search score
        else if (candidate.score !== undefined && candidate.score !== null) {
            // Azure Search scores can vary, but typically normalize to percentage
            if (candidate.score > 1) {
                // If score is greater than 1, it's likely on a different scale
                return Math.min(100, Math.round(candidate.score));
            } else {
                return Math.round(candidate.score * 100);
            }
        }
        // If we have @search.score
        else if (candidate['@search.score']) {
            return Math.round(candidate['@search.score'] * 100);
        }
        return 0;
    };

    const matchPercentage = getMatchPercentage();
    
    const getScoreColor = (percentage) => {
        if (percentage >= 80) return '#22c55e'; // Green
        if (percentage >= 60) return '#3b82f6'; // Blue
        if (percentage >= 40) return '#f59e0b'; // Orange
        return '#6b7280'; // Gray
    };

    // 🔥 Get semantic caption if available
    const getCaption = () => {
        if (candidate.captions && candidate.captions.length > 0) {
            if (typeof candidate.captions[0] === 'object' && candidate.captions[0].text) {
                return candidate.captions[0].text;
            }
            return candidate.captions[0];
        }
        return null;
    };

    const caption = getCaption();

    return (
        <div className="ai-candidate-card">
            <div className="card-header">
                <div className="rank-badge">#{rank}</div>
                <div className="candidate-info">
                    <h4 className="candidate-name">{candidate.fullName || 'Unknown'}</h4>
                    <p className="candidate-email">{candidate.email || 'N/A'}</p>
                </div>
                <div className="match-score" style={{ color: getScoreColor(matchPercentage) }}>
                    <span className="score-value">{matchPercentage}%</span>
                    <span className="score-label">
                        {candidate.rerankerScore !== undefined ? 'AI Match' : 'Match'}
                    </span>
                </div>
            </div>

            <div className="card-body">
                {/* 🔥 Show semantic search caption if available */}
                {caption && (
                    <div className="semantic-caption">
                        <span className="caption-icon">💡</span>
                        <p className="caption-text">{caption}</p>
                    </div>
                )}

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

                {/* 🔥 Show resume preview if available and no caption */}
                {!caption && candidate.resumeText && (
                    <div className="resume-preview">
                        <p className="preview-text">
                            {candidate.resumeText.substring(0, 150)}...
                        </p>
                    </div>
                )}

                {/* 🔥 Debug info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="debug-info" style={{ 
                        fontSize: '10px', 
                        color: '#666', 
                        marginTop: '10px',
                        padding: '5px',
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: '4px'
                    }}>
                        <div>Search Score: {candidate.score?.toFixed(3) || 'N/A'}</div>
                        {candidate.rerankerScore !== undefined && (
                            <div>Reranker Score: {candidate.rerankerScore.toFixed(3)}</div>
                        )}
                        <div>Search Type: {candidate.rerankerScore !== undefined ? 'Semantic' : 'Keyword'}</div>
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
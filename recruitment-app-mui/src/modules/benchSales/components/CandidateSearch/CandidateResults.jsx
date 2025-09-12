import React from 'react';
import CandidateCard from './CandidateCard';

const CandidateResults = ({ candidates, loading, onCandidateAction, searchMode }) => {
  if (loading) {
    return (
      <div className="results-loading">
        <div className="spinner"></div>
        <p>🔍 AI is searching through candidates...</p>
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div className="results-empty">
        <div className="empty-icon"></div>
        <h3>No results yet</h3>
        <p>Start searching to see AI-matched candidates</p>
      </div>
    );
  }

  return (
    <div className="candidate-results">
      <div className="results-header">
        <h3>
          {searchMode === 'jd' ? '🎯 Best Matches' : '🔍 Search Results'} 
          <span className="result-count">({candidates.length} candidates)</span>
        </h3>
      </div>

      <div className="results-grid">
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.candidateId || index}
            candidate={candidate}
            rank={index + 1}
            onAction={onCandidateAction}
            searchMode={searchMode}
          />
        ))}
      </div>
    </div>
  );
};

export default CandidateResults;
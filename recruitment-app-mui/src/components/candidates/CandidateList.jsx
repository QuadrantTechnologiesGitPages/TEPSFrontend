import React from 'react';
import CandidateCard from './CandidateCard.jsx';

const CandidateList = ({ candidates, onViewDetails }) => {
  if (candidates.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>No candidates found</h3>
        <p>Try adjusting your search criteria or filters</p>
      </div>
    );
  }

  return (
    <div className="candidates-grid">
      {candidates.map((candidate, index) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          onViewDetails={onViewDetails}
          animationDelay={index * 0.1}
        />
      ))}
    </div>
  );
};

export default CandidateList;
import React, { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import JDMatcher from './JDMatcher';
import CandidateResults from './CandidateResults';
import '../../styles/CandidateSearch.css';
import toast from 'react-hot-toast';

const CandidateSearch = () => {
  const [searchMode, setSearchMode] = useState('natural'); // 'natural' or 'jd'
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState(null);

  // Natural language search
  const handleNaturalSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
        console.log('Sending search query:', query); // Debug log
      const response = await fetch('http://localhost:5000/api/search/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, top: 20 })
      });

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results);
        toast.success(`Found ${data.count} candidates`);
      } else {
        toast.error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search candidates');
    } finally {
      setLoading(false);
    }
  };

  // Job description matching
  const handleJDMatch = async (jobDescription) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/search/match-jd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription, top: 20 })
      });

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.candidates);
        setSearchMetadata(data.requirements);
        toast.success(`Found ${data.candidates.length} matching candidates`);
      } else {
        toast.error(data.error || 'Matching failed');
      }
    } catch (error) {
      console.error('JD matching error:', error);
      toast.error('Failed to match candidates');
    } finally {
      setLoading(false);
    }
  };

  // Handle candidate action
  const handleCandidateAction = (candidate, action) => {
    switch(action) {
      case 'view':
        // Navigate to candidate view
        window.dispatchEvent(new CustomEvent('navigate', { 
          detail: { 
            view: 'candidateView',
            candidateId: candidate.candidateId 
          }
        }));
        break;
      case 'contact':
        toast.success(`Opening contact for ${candidate.fullName}`);
        break;
      case 'shortlist':
        toast.success(`${candidate.fullName} added to shortlist`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="candidate-search-container">
      <div className="search-header">
        <h2>🔍 AI-Powered Candidate Search</h2>
        <div className="search-mode-toggle">
          <button 
            className={`mode-btn ${searchMode === 'natural' ? 'active' : ''}`}
            onClick={() => setSearchMode('natural')}
          >
            Natural Language Search
          </button>
          <button 
            className={`mode-btn ${searchMode === 'jd' ? 'active' : ''}`}
            onClick={() => setSearchMode('jd')}
          >
            Job Description Matching
          </button>
        </div>
      </div>

      <div className="search-input-section">
        {searchMode === 'natural' ? (
          <SearchBar onSearch={handleNaturalSearch} loading={loading} />
        ) : (
          <JDMatcher onMatch={handleJDMatch} loading={loading} />
        )}
      </div>

      {searchMetadata && searchMode === 'jd' && (
        <div className="search-metadata">
          <h3>📋 Extracted Requirements</h3>
          <div className="metadata-grid">
            {searchMetadata.minExperience && (
              <div className="metadata-item">
                <span className="metadata-label">Experience:</span>
                <span className="metadata-value">{searchMetadata.minExperience}+ years</span>
              </div>
            )}
            {searchMetadata.location && (
              <div className="metadata-item">
                <span className="metadata-label">Location:</span>
                <span className="metadata-value">{searchMetadata.location}</span>
              </div>
            )}
            {searchMetadata.visaRequirement && (
              <div className="metadata-item">
                <span className="metadata-label">Visa:</span>
                <span className="metadata-value">{searchMetadata.visaRequirement}</span>
              </div>
            )}
            {searchMetadata.skills && searchMetadata.skills.length > 0 && (
              <div className="metadata-item full-width">
                <span className="metadata-label">Skills:</span>
                <div className="skill-tags">
                  {searchMetadata.skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CandidateResults 
        candidates={searchResults}
        loading={loading}
        onCandidateAction={handleCandidateAction}
        searchMode={searchMode}
      />
    </div>
  );
};

export default CandidateSearch;
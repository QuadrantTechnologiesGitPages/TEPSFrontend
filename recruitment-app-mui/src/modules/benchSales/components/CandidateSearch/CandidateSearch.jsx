// CandidateSearch.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import JDMatcher from './JDMatcher';
import CandidateResults from './CandidateResults';
import candidateSearchService from '../../services/candidateSearchService';
import '../../styles/CandidateSearch.css';

const CandidateSearch = () => {
  const [searchMode, setSearchMode] = useState('natural'); // 'natural' or 'jd'
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Test service connection on mount
  useEffect(() => {
    const testService = async () => {
      const status = await candidateSearchService.testConnection();
      setServiceStatus(status);
      if (!status.working) {
        console.error('Service error:', status.message);
        setStatusMessage(status.message);
      } else {
        console.log('✅ Service connected:', status.message);
      }
    };
    testService();
  }, []);

  // Natural language search using service
  const handleNaturalSearch = async (query) => {
    // Clear previous results if empty query
    if (!query || !query.trim()) {
      setSearchResults([]);
      setStatusMessage('');
      return;
    }

    setLoading(true);
    setStatusMessage(''); // Clear any previous messages
    setSearchResults([]); // Clear previous results while loading
    
    try {
      console.log('🔍 Frontend: Searching for:', query);
      
      const result = await candidateSearchService.searchCandidates(query);
      
      console.log('📊 Frontend: Search result received:', {
        success: result.success,
        count: result.count,
        candidatesLength: result.candidates?.length
      });
      
      if (result.success && result.candidates && result.candidates.length > 0) {
        // Successfully found candidates
        setSearchResults(result.candidates);
        console.log(`✅ Frontend: Displaying ${result.candidates.length} candidates`);
        setStatusMessage(`Found ${result.count || result.candidates.length} candidates`);
      } else if (result.success && result.candidates && result.candidates.length === 0) {
        // Search succeeded but no results
        setSearchResults([]);
        console.log('ℹ️ Frontend: No candidates found');
        setStatusMessage('No candidates found matching your search. Try different keywords.');
      } else {
        // Search failed
        setSearchResults([]);
        const errorMsg = result.error || 'Search failed. Please try again.';
        console.error('❌ Frontend: Search failed:', errorMsg);
        setStatusMessage(errorMsg);
      }
    } catch (error) {
      console.error('❌ Frontend: Unexpected search error:', error);
      setStatusMessage('Unable to search. Please check your connection and try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Job description matching using service
  const handleJDMatch = async (jobDescription) => {
    if (!jobDescription.trim() || jobDescription.length < 50) {
      setStatusMessage('Please provide a detailed job description (min 50 characters)');
      return;
    }

    setLoading(true);
    setStatusMessage(''); // Clear any previous messages
    setSearchResults([]); // Clear previous results
    
    try {
      console.log('📄 Frontend: Matching JD...');
      
      const result = await candidateSearchService.matchJobDescription(jobDescription);
      
      console.log('📊 Frontend: JD match result:', {
        success: result.success,
        candidatesLength: result.candidates?.length,
        hasRequirements: !!result.requirements
      });
      
      if (result.success && result.candidates && result.candidates.length > 0) {
        setSearchResults(result.candidates);
        setSearchMetadata(result.requirements);
        console.log(`✅ Frontend: Found ${result.candidates.length} matching candidates`);
        setStatusMessage(`Found ${result.candidates.length} matching candidates`);
      } else if (result.success && result.candidates && result.candidates.length === 0) {
        setSearchResults([]);
        setSearchMetadata(null);
        console.log('ℹ️ Frontend: No matching candidates');
        setStatusMessage('No candidates match this job description. Try adjusting the requirements.');
      } else {
        setSearchResults([]);
        setSearchMetadata(null);
        const errorMsg = result.error || 'JD matching failed';
        console.error('❌ Frontend: JD matching failed:', errorMsg);
        setStatusMessage(errorMsg);
      }
    } catch (error) {
      console.error('❌ Frontend: Unexpected JD matching error:', error);
      setStatusMessage('Unable to match job description. Please try again.');
      setSearchResults([]);
      setSearchMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle candidate action
  const handleCandidateAction = (candidate, action) => {
    console.log(`Frontend: Action ${action} for candidate:`, candidate.fullName);
    
    switch(action) {
      case 'view':
        if (candidate.candidateId) {
          // Navigate to candidate view
          window.dispatchEvent(new CustomEvent('navigate', { 
            detail: { 
              view: 'candidateView',
              candidateId: candidate.candidateId 
            }
          }));
        } else {
          console.error('Cannot view candidate - ID missing');
          setStatusMessage('Cannot view candidate details');
        }
        break;
        
      case 'contact':
        if (candidate.email) {
          console.log(`Opening contact for ${candidate.fullName}`);
          // Uncomment to actually open email client
          // window.location.href = `mailto:${candidate.email}`;
          setStatusMessage(`Contact: ${candidate.email}`);
        } else {
          setStatusMessage('No email available for this candidate');
        }
        break;
        
      case 'shortlist':
        console.log(`${candidate.fullName} added to shortlist`);
        setStatusMessage(`${candidate.fullName} added to shortlist`);
        // TODO: Add actual shortlist logic here
        break;
        
      default:
        console.warn('Unknown action:', action);
    }
  };

  // Example searches for quick access
  const handleExampleSearch = async (type) => {
    const examples = {
      senior: 'Senior developer with 8+ years experience',
      react: 'React developer in Toronto',
      devops: 'DevOps engineer with Kubernetes',
      python: 'Python developer with machine learning',
      immediate: 'Developer available immediately',
      remote: 'Developer open to remote work'
    };
    
    const query = examples[type];
    if (query) {
      await handleNaturalSearch(query);
    }
  };

  return (
    <div className="candidate-search-container">
      <div className="search-header">
        <h2>🔍 AI-Powered Candidate Search</h2>
        <div className="search-mode-toggle">
          <button 
            className={`mode-btn ${searchMode === 'natural' ? 'active' : ''}`}
            onClick={() => {
              setSearchMode('natural');
              setSearchResults([]);
              setStatusMessage('');
              setSearchMetadata(null);
            }}
          >
            Natural Language Search
          </button>
          <button 
            className={`mode-btn ${searchMode === 'jd' ? 'active' : ''}`}
            onClick={() => {
              setSearchMode('jd');
              setSearchResults([]);
              setStatusMessage('');
              setSearchMetadata(null);
            }}
          >
            Job Description Matching
          </button>
        </div>
      </div>

      {/* Service status indicator */}
      {serviceStatus && !serviceStatus.working && (
        <div className="service-warning">
          ⚠️ Search service issue: {serviceStatus.message}
        </div>
      )}

      {/* Status message display */}
      {statusMessage && !loading && (
        <div className={`status-message ${searchResults.length > 0 ? 'success' : 'info'}`}>
          {statusMessage}
        </div>
      )}

      <div className="search-input-section">
        {searchMode === 'natural' ? (
          <SearchBar onSearch={handleNaturalSearch} loading={loading} />
        ) : (
          <JDMatcher onMatch={handleJDMatch} loading={loading} />
        )}
      </div>



      {/* Search metadata for JD matching */}
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

      {/* Results section */}
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
import React, { useState } from 'react';
import './styles/globals.css';
import Layout from './components/common/Layout.jsx';
import SearchBar from './components/search/SearchBar.jsx';
import SearchFilters from './components/search/SearchFilters.jsx';
import CandidateList from './components/candidates/CandidateList.jsx';
import CandidateDetails from './components/candidates/CandidateDetails.jsx';
import MessageComposer from './components/communication/MessageComposer.jsx';
import { mockCandidates } from './data/mockData';
import { searchCandidates } from './utils/candidateMatcher';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    visa: '',
    status: '',
    location: '',
    experience: ''
  });
  const [searchResults, setSearchResults] = useState(mockCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageType, setMessageType] = useState(''); // 'candidate' or 'referrer'

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    const results = searchCandidates(query, filters, mockCandidates);
    setSearchResults(results);
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    const results = searchCandidates(searchQuery, newFilters, mockCandidates);
    setSearchResults(results);
  };

  // Open candidate details
  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setDetailsOpen(true);
  };

  // Close candidate details
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setTimeout(() => setSelectedCandidate(null), 300);
  };

  // Open message composer
  const handleOpenMessage = (type, candidate) => {
    setSelectedCandidate(candidate || selectedCandidate);
    setMessageType(type);
    setMessageOpen(true);
    if (detailsOpen) setDetailsOpen(false);
  };

  // Close message composer
  const handleCloseMessage = () => {
    setMessageOpen(false);
    setTimeout(() => setMessageType(''), 300);
  };

  return (
    <Layout>
      <div className="search-section">
        <SearchBar onSearch={handleSearch} />
        <SearchFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
        />
      </div>

      <div className="results-section">
        <h2 className="results-header">
          Top Matches ({searchResults.length})
        </h2>
        <CandidateList 
          candidates={searchResults}
          onViewDetails={handleViewDetails}
        />
      </div>

      {selectedCandidate && (
        <>
          <CandidateDetails
            candidate={selectedCandidate}
            isOpen={detailsOpen}
            onClose={handleCloseDetails}
            onContactReferrer={() => handleOpenMessage('referrer', selectedCandidate)}
            onContactCandidate={() => handleOpenMessage('candidate', selectedCandidate)}
          />

          <MessageComposer
            isOpen={messageOpen}
            onClose={handleCloseMessage}
            type={messageType}
            candidate={selectedCandidate}
          />
        </>
      )}
    </Layout>
  );
}

export default App;
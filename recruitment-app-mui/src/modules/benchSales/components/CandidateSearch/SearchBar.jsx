// SearchBar.jsx - FIXED VERSION
import React, { useState } from 'react';

const SearchBar = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      console.log('SearchBar: Submitting query:', query);
      onSearch(query.trim());
    }
  };

  const exampleQueries = [
    "Developer open to remote work",
    "Senior React developer with 5+ years in Toronto",
    "Python developer with machine learning experience",
    "Full stack developer with AWS and citizen status",
    "Java developer with microservices experience available immediately"
  ];

  const handleExampleClick = (example) => {
    console.log('SearchBar: Using example query:', example);
    setQuery(example);
    onSearch(example);
  };

  return (
    <div className="natural-search-bar">
      <form onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <span className="search-icon"></span>
          <input
            type="text"
            className="search-input"
            placeholder="Describe your ideal candidate in natural language..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button 
            type="submit" 
            className="search-btn"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Searching...
              </>
            ) : (
              'Search with AI'
            )}
          </button>
        </div>
      </form>

      {!loading && (
        <div className="example-queries">
          <span className="example-label">Try these examples:</span>
          <div className="example-chips-container">
            {exampleQueries.map((example, idx) => (
              <button
                key={idx}
                className="example-chip"
                onClick={() => handleExampleClick(example)}
                disabled={loading}
                title={example}
              >
                {example.length > 50 ? example.substring(0, 47) + '...' : example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
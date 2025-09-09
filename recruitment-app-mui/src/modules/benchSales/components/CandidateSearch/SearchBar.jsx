import React, { useState } from 'react';

const SearchBar = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const exampleQueries = [
    "Senior React developer with 5+ years in Toronto",
    "Python developer with machine learning experience",
    "Full stack developer with AWS and citizen status",
    "Java developer with microservices experience"
  ];

  const handleExampleClick = (example) => {
    setQuery(example);
    onSearch(example);
  };

  return (
    <div className="natural-search-bar">
      <form onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Describe your ideal candidate in natural language..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="search-btn"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Search with AI'}
          </button>
        </div>
      </form>

      <div className="example-queries">
        <span className="example-label">Try these examples:</span>
        {exampleQueries.map((example, idx) => (
          <button
            key={idx}
            className="example-chip"
            onClick={() => handleExampleClick(example)}
            disabled={loading}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
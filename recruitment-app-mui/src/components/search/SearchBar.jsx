import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    // Real-time search as user types
    if (value.length > 2 || value.length === 0) {
      onSearch(value);
    }
  };

  return (
    <form onSubmit={handleSearch} className="search-bar">
      <div className="search-input-container">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M9 17A8 8 0 109 1a8 8 0 000 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder='Try: "want .net developer who is active and was referred by ram in washington with 3+ years experience"'
          value={query}
          onChange={handleInputChange}
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </div>
      <div className="search-hints">
        <span className="hint">💡 Tip: Use natural language like "Python developer with H1B in Seattle" or "Active candidates referred by Ram"</span>
      </div>
    </form>
  );
};

export default SearchBar;
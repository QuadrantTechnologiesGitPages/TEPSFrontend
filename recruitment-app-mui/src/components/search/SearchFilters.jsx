import React from 'react';

const SearchFilters = ({ filters, onFilterChange }) => {
  const handleFilterChange = (filterName, value) => {
    onFilterChange({
      ...filters,
      [filterName]: value
    });
  };

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label className="filter-label">Visa Status</label>
        <select 
          className="filter-select"
          value={filters.visa}
          onChange={(e) => handleFilterChange('visa', e.target.value)}
        >
          <option value="">All Visa Types</option>
          <option value="H1B">H1B</option>
          <option value="OPT-EAD">OPT-EAD</option>
          <option value="GC-EAD">GC-EAD</option>
          <option value="F1">F1</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Availability</label>
        <select 
          className="filter-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending Discussion">Pending Discussion</option>
          <option value="In Active">In Active</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Location</label>
        <select 
          className="filter-select"
          value={filters.location}
          onChange={(e) => handleFilterChange('location', e.target.value)}
        >
          <option value="">All Locations</option>
          <option value="WA">Washington</option>
          <option value="TX">Texas</option>
          <option value="CA">California</option>
          <option value="OR">Oregon</option>
          <option value="NY">New York</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Experience</label>
        <select 
          className="filter-select"
          value={filters.experience}
          onChange={(e) => handleFilterChange('experience', e.target.value)}
        >
          <option value="">All Experience</option>
          <option value="0-2">0-2 years</option>
          <option value="3-5">3-5 years</option>
          <option value="5-8">5-8 years</option>
          <option value="8+">8+ years</option>
        </select>
      </div>
    </div>
  );
};

export default SearchFilters;
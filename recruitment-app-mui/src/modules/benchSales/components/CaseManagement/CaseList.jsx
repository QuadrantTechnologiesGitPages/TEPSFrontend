// src/modules/benchSales/components/CaseManagement/CaseList.jsx
import React, { useState, useEffect } from 'react';
import { useCases } from '../../contexts/CaseContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { CaseStatus, Priority } from '../../models/caseModel';
import '../../styles/CaseManagement.css';

const CaseList = () => {
  const { getFilteredCases, filters, setFilters, getCaseStats } = useCases();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // grid or table

  useEffect(() => {
    const filtered = getFilteredCases();
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'createdDate' || sortBy === 'modifiedDate') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    setCases(sorted);
  }, [filters, sortBy, sortOrder]);

  const stats = getCaseStats();

  const handleStatusFilter = (status) => {
    setFilters({ ...filters, status: filters.status === status ? '' : status });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      1: 'Critical',
      2: 'High',
      3: 'Medium',
      4: 'Low'
    };
    return labels[priority] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colors = {
      [CaseStatus.INTAKE]: '#a0aec0',
      [CaseStatus.VERIFICATION_PENDING]: '#f6ad55',
      [CaseStatus.VERIFIED]: '#48bb78',
      [CaseStatus.SUBMITTED]: '#4299e1',
      [CaseStatus.PLACED]: '#38b2ac',
      [CaseStatus.ON_HOLD]: '#ed8936',
      [CaseStatus.CLOSED]: '#718096'
    };
    return colors[status] || '#a0aec0';
  };

  const calculateDaysOld = (createdDate) => {
    const created = new Date(createdDate);
    const now = new Date();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="case-list-container">
      {/* Header */}
      <div className="case-list-header">
        <h1>Case Management</h1>
        <div className="header-actions">
          <button className="btn-new-case">+ New Case</button>
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >Grid</button>
            <button 
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >Table</button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="case-stats-bar">
        <div className="stat-item" onClick={() => handleStatusFilter('')}>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Cases</span>
        </div>
        <div className="stat-item" onClick={() => handleStatusFilter(CaseStatus.INTAKE)}>
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-item" onClick={() => handleStatusFilter(CaseStatus.VERIFICATION_PENDING)}>
          <span className="stat-value">{stats.pendingVerification}</span>
          <span className="stat-label">Pending Verification</span>
        </div>
        <div className="stat-item" onClick={() => handleStatusFilter(CaseStatus.SUBMITTED)}>
          <span className="stat-value">{stats.submitted}</span>
          <span className="stat-label">Submitted</span>
        </div>
      </div>

      {/* Filters */}
      <div className="case-filters">
        <input 
          type="text"
          placeholder="Search cases..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        
        <select 
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="filter-select"
        >
          <option value="">All Priorities</option>
          <option value="1">Critical</option>
          <option value="2">High</option>
          <option value="3">Medium</option>
          <option value="4">Low</option>
        </select>

        <select 
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">All Status</option>
          {Object.values(CaseStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* Case List */}
      {viewMode === 'grid' ? (
        <div className="cases-grid">
          {cases.map(caseItem => (
            <div key={caseItem.caseId} className="case-card">
              <div className="case-card-header">
                <span className="case-id">{caseItem.caseId}</span>
                <span 
                  className="case-status-badge"
                  style={{ backgroundColor: getStatusColor(caseItem.status) }}
                >
                  {caseItem.status}
                </span>
              </div>
              
              <div className="case-card-body">
                <h3>{caseItem.name}</h3>
                <p className="case-meta">
                  {caseItem.visa} • {caseItem.location} • {caseItem.yearsExp}
                </p>
                <div className="case-skills">
                  {caseItem.skills?.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
              
              <div className="case-card-footer">
                <span className={`priority-badge priority-${caseItem.priority}`}>
                  {getPriorityLabel(caseItem.priority)}
                </span>
                <span className="days-old">
                  {calculateDaysOld(caseItem.createdDate)} days old
                </span>
              </div>
              
              <div className="case-card-actions">
                <button className="action-btn">View</button>
                <button className="action-btn">Update</button>
                <button className="action-btn">Notes</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="cases-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('caseId')}>Case ID</th>
              <th onClick={() => handleSort('name')}>Name</th>
              <th onClick={() => handleSort('status')}>Status</th>
              <th onClick={() => handleSort('priority')}>Priority</th>
              <th>Skills</th>
              <th onClick={() => handleSort('createdDate')}>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map(caseItem => (
              <tr key={caseItem.caseId}>
                <td>{caseItem.caseId}</td>
                <td>{caseItem.name}</td>
                <td>
                  <span 
                    className="case-status-badge"
                    style={{ backgroundColor: getStatusColor(caseItem.status) }}
                  >
                    {caseItem.status}
                  </span>
                </td>
                <td>
                  <span className={`priority-badge priority-${caseItem.priority}`}>
                    {getPriorityLabel(caseItem.priority)}
                  </span>
                </td>
                <td>{caseItem.skills?.slice(0, 2).join(', ')}</td>
                <td>{new Date(caseItem.createdDate).toLocaleDateString()}</td>
                <td>
                  <button className="action-btn-small">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CaseList;
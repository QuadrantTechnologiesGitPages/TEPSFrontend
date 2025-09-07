// recruitment-app-mui/src/modules/benchSales/components/CandidateManagement/CandidateList.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import candidateService from '../../services/candidateService';
import '../../styles/CandidateManagement.css';

const CandidateList = ({ onNavigate }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    visa_status: 'all'
  });
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    placed: 0,
    onHold: 0
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchCandidates();
    fetchStats();
  }, [filters, sortBy, sortOrder]);

  useEffect(() => {
    setShowBulkActions(selectedCandidates.length > 0);
  }, [selectedCandidates]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const filterParams = {};
      if (filters.status !== 'all') filterParams.status = filters.status;
      if (filters.visa_status !== 'all') filterParams.visa_status = filters.visa_status;
      if (filters.search) filterParams.search = filters.search;

      const data = await candidateService.getCandidates(filterParams);
      
      // Sort candidates
      let sortedCandidates = [...(data.candidates || data || [])];
      sortedCandidates.sort((a, b) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setCandidates(sortedCandidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await candidateService.getCandidateStats();
      setStats(data.stats || data || {
        total: 0,
        active: 0,
        placed: 0,
        onHold: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value });
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setFilters({ ...filters, status });
    setCurrentPage(1);
  };

  const handleVisaFilter = (visa_status) => {
    setFilters({ ...filters, visa_status });
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else {
        return [...prev, candidateId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map(c => c.id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (!selectedCandidates.length) return;
    
    const confirmMsg = `Update status to "${newStatus}" for ${selectedCandidates.length} candidate(s)?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await candidateService.bulkUpdateStatus(selectedCandidates, newStatus);
      toast.success(`Updated ${selectedCandidates.length} candidates`);
      setSelectedCandidates([]);
      fetchCandidates();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update candidates');
    }
  };

  const handleExport = async () => {
    try {
      await candidateService.exportToCSV(filters);
      toast.success('Exported to CSV');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleViewCandidate = (candidate) => {
    if (onNavigate) {
      onNavigate('candidateView', { candidateId: candidate.id });
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: {
          view: 'candidateView',
          candidateId: candidate.id
        }
      }));
    }
  };

  const handleEditCandidate = (candidate) => {
    if (onNavigate) {
      onNavigate('candidateEdit', { candidateId: candidate.id });
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: {
          view: 'candidateEdit',
          candidateId: candidate.id
        }
      }));
    }
  };

  const handleCreateCandidate = () => {
    if (onNavigate) {
      onNavigate('candidateCreate');
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { view: 'candidateCreate' }
      }));
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;

    try {
      await candidateService.deleteCandidate(candidateId);
      toast.success('Candidate deleted successfully');
      fetchCandidates();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete candidate');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatSkills = (skills) => {
    if (!skills) return 'N/A';
    
    try {
      const skillArray = typeof skills === 'string' ? JSON.parse(skills) : skills;
      if (Array.isArray(skillArray)) {
        return skillArray.slice(0, 3).join(', ') + (skillArray.length > 3 ? '...' : '');
      }
    } catch {
      return skills || 'N/A';
    }
    
    return skills || 'N/A';
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      'Active': 'badge-success',
      'Inactive': 'badge-secondary',
      'Placed': 'badge-info',
      'On Hold': 'badge-warning'
    };
    return `badge ${classes[status] || 'badge-secondary'}`;
  };

  const getVisaBadgeClass = (visa) => {
    const classes = {
      'H1B': 'badge-primary',
      'OPT-EAD': 'badge-info',
      'GC-EAD': 'badge-success',
      'Green Card': 'badge-success',
      'US Citizen': 'badge-dark'
    };
    return `badge ${classes[visa] || 'badge-secondary'}`;
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCandidates = candidates.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(candidates.length / itemsPerPage);

  if (loading) {
    return (
      <div className="candidate-list-loading">
        <div className="spinner"></div>
        <p>Loading candidates...</p>
      </div>
    );
  }

  return (
    <div className="candidate-list-container">
      {/* Header */}
      <div className="candidate-list-header">
        <h2>Candidate Management</h2>
        <div className="header-actions">
          <button className="btn-create-candidate" onClick={handleCreateCandidate}>
            + Create Candidate
          </button>
          <button className="btn-export" onClick={handleExport}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-value">{stats.total || 0}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.active || 0}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.placed || 0}</span>
          <span className="stat-label">Placed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.onHold || 0}</span>
          <span className="stat-label">On Hold</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, skills..."
            value={filters.search}
            onChange={handleSearch}
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filters.status}
            onChange={(e) => handleStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Placed">Placed</option>
            <option value="On Hold">On Hold</option>
          </select>

          <select
            value={filters.visa_status}
            onChange={(e) => handleVisaFilter(e.target.value)}
          >
            <option value="all">All Visa Status</option>
            <option value="H1B">H1B</option>
            <option value="OPT-EAD">OPT-EAD</option>
            <option value="GC-EAD">GC-EAD</option>
            <option value="Green Card">Green Card</option>
            <option value="US Citizen">US Citizen</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bulk-actions-bar">
          <span>{selectedCandidates.length} selected</span>
          <div className="bulk-actions">
            <button onClick={() => handleBulkStatusUpdate('Active')}>
              Mark Active
            </button>
            <button onClick={() => handleBulkStatusUpdate('On Hold')}>
              Mark On Hold
            </button>
            <button onClick={() => handleBulkStatusUpdate('Inactive')}>
              Mark Inactive
            </button>
            <button onClick={() => setSelectedCandidates([])}>
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Candidates Table */}
      {candidates.length === 0 ? (
        <div className="no-candidates">
          <p>No candidates found</p>
          <button onClick={handleCreateCandidate}>Create First Candidate</button>
        </div>
      ) : (
        <>
          <div className="candidates-table-container">
            <table className="candidates-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedCandidates.length === candidates.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th onClick={() => handleSort('name')}>
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('email')}>
                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Visa Status</th>
                  <th>Skills</th>
                  <th>Status</th>
                  <th onClick={() => handleSort('created_at')}>
                    Created {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentCandidates.map(candidate => (
                  <tr key={candidate.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedCandidates.includes(candidate.id)}
                        onChange={() => handleSelectCandidate(candidate.id)}
                      />
                    </td>
                    <td className="candidate-name">
                      <a onClick={() => handleViewCandidate(candidate)}>
                        {candidate.name}
                      </a>
                    </td>
                    <td>{candidate.email}</td>
                    <td>{candidate.phone || 'N/A'}</td>
                    <td>{candidate.current_location || 'N/A'}</td>
                    <td>
                      {candidate.visa_status && (
                        <span className={getVisaBadgeClass(candidate.visa_status)}>
                          {candidate.visa_status}
                        </span>
                      )}
                    </td>
                    <td title={candidate.skills}>{formatSkills(candidate.skills)}</td>
                    <td>
                      <span className={getStatusBadgeClass(candidate.status)}>
                        {candidate.status}
                      </span>
                    </td>
                    <td>{formatDate(candidate.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action view"
                          title="View"
                          onClick={() => handleViewCandidate(candidate)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-action edit"
                          title="Edit"
                          onClick={() => handleEditCandidate(candidate)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-action delete"
                          title="Delete"
                          onClick={() => handleDeleteCandidate(candidate.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CandidateList;
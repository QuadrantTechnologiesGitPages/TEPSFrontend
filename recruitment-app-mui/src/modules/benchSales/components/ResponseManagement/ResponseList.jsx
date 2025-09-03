// src/modules/benchSales/components/ResponseManagement/ResponseList.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import '../../styles/ResponseManagement.css';
import responseService from '../../services/responseService';

const ResponseList = () => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, processed
  const [showCreateCandidate, setShowCreateCandidate] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, [filter]);

const fetchResponses = async () => {
  setLoading(true);
  try {
    const filters = {};
    if (filter === 'pending') filters.processed = false;
    if (filter === 'processed') filters.processed = true;
    
    const data = await responseService.getResponses(filters);
    setResponses(data.responses || []);
  } catch (error) {
    toast.error('Failed to load responses');
    setResponses([]);
  } finally {
    setLoading(false);
  }
};

const markAsProcessed = async (responseId) => {
  try {
    await responseService.markAsProcessed(responseId);
    toast.success('Response marked as processed');
    fetchResponses();
  } catch (error) {
    toast.error('Failed to mark as processed');
  }
};

const createCandidate = async (responseId) => {
  try {
    const data = await responseService.createCandidate(responseId);
    toast.success(`Candidate created: ${data.caseId}`);
    fetchResponses();
    setShowCreateCandidate(false);
    setSelectedResponse(null);
  } catch (error) {
    toast.error('Failed to create candidate');
  }
};

 const exportToCSV = async () => {
  try {
    await responseService.exportToCSV();
    toast.success('Exported to CSV');
  } catch (error) {
    toast.error('Failed to export CSV');
  }
};

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="response-list-loading">
        <div className="spinner"></div>
        <p>Loading responses...</p>
      </div>
    );
  }

  return (
    <div className="response-list-container">
      <div className="response-list-header">
        <h2>Form Responses</h2>
        <div className="response-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({responses.length})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${filter === 'processed' ? 'active' : ''}`}
            onClick={() => setFilter('processed')}
          >
            Processed
          </button>
          <button className="btn-export" onClick={exportToCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="no-responses">
          <p>No responses found</p>
        </div>
      ) : (
        <div className="response-grid">
          {responses.map(response => (
            <div key={response.id} className="response-card">
              <div className="response-card-header">
                <h3>{response.candidate_name || 'Unknown'}</h3>
                {!response.processed && <span className="badge new">New</span>}
                {response.case_created && <span className="badge case">Case Created</span>}
              </div>
              
              <div className="response-card-body">
                <p><strong>Email:</strong> {response.candidate_email}</p>
                <p><strong>Submitted:</strong> {formatDate(response.submitted_at)}</p>
                {response.caseId && <p><strong>Case:</strong> {response.caseId}</p>}
                
                <button
                  className="btn-view-details"
                  onClick={() => setSelectedResponse(response)}
                >
                  View Details
                </button>
              </div>

              <div className="response-card-actions">
                {!response.processed && (
                  <button
                    className="btn-process"
                    onClick={() => markAsProcessed(response.id)}
                  >
                    ✓ Mark Processed
                  </button>
                )}
                
                {!response.case_created && (
                  <button
                    className="btn-create-case"
                    onClick={() => {
                      setSelectedResponse(response);
                      setShowCreateCandidate(true);
                    }}
                  >
                    Create Candidate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Details Modal */}
      {selectedResponse && !showCreateCandidate && (
        <div className="modal-overlay" onClick={() => setSelectedResponse(null)}>
          <div className="response-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Response Details</h2>
              <button className="close-btn" onClick={() => setSelectedResponse(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <h3>{selectedResponse.candidate_name}</h3>
              <p>{selectedResponse.candidate_email}</p>
              
              <div className="response-data">
                <h4>Form Data:</h4>
                {Object.entries(selectedResponse.response_data || {}).map(([key, value]) => (
                  <div key={key} className="data-field">
                    <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              {!selectedResponse.processed && (
                <button
                  className="btn-process"
                  onClick={() => {
                    markAsProcessed(selectedResponse.id);
                    setSelectedResponse(null);
                  }}
                >
                  Mark as Processed
                </button>
              )}
              {!selectedResponse.case_created && (
                <button
                  className="btn-create-case"
                  onClick={() => setShowCreateCandidate(true)}
                >
                  Create Candidate
                </button>
              )}
              <button className="btn-close" onClick={() => setSelectedResponse(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Candidate Confirmation */}
      {showCreateCandidate && selectedResponse && (
        <div className="modal-overlay" onClick={() => setShowCreateCandidate(false)}>
          <div className="create-candidate-modal" onClick={e => e.stopPropagation()}>
            <h3>Create Candidate Profile</h3>
            <p>Create a candidate profile from this form response?</p>
            <p><strong>Name:</strong> {selectedResponse.candidate_name}</p>
            <p><strong>Email:</strong> {selectedResponse.candidate_email}</p>
            
            <div className="modal-actions">
              <button
                className="btn-confirm"
                onClick={() => createCandidate(selectedResponse.id)}
              >
                Create Candidate
              </button>
              <button
                className="btn-cancel"
                onClick={() => setShowCreateCandidate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseList;
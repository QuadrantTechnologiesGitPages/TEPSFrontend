// recruitment-app-mui/src/modules/benchSales/components/ResponseManagement/ResponseList.jsx - UPDATED
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import '../../styles/ResponseManagement.css';
import responseService from '../../services/responseService';
import candidateService from '../../services/candidateService';
import formService from '../../services/formTemplateService';

const ResponseList = () => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCreateCandidate, setShowCreateCandidate] = useState(false);
  const [templateCache, setTemplateCache] = useState({});
  const [creatingCandidate, setCreatingCandidate] = useState(false);

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
      console.log('Fetched data:', data);
      
      // Get unique template IDs
      const templateIds = [...new Set((data.responses || [])
        .filter(r => r.template_id)
        .map(r => r.template_id))];
      
      // Fetch all templates
      const templates = {};
      for (const templateId of templateIds) {
        try {
          const templateData = await formService.getTemplateById(templateId);
          if (templateData) {
            const template = templateData.template || templateData;
            templates[templateId] = template;
          }
        } catch (err) {
          console.error(`Failed to fetch template ${templateId}:`, err);
        }
      }
      
      setTemplateCache(templates);
      
      // Parse responses and map field IDs to labels
      const parsedResponses = (data.responses || []).map(response => {
        let parsedData = response.response_data;
        
        // Parse if string
        if (typeof parsedData === 'string') {
          try {
            parsedData = JSON.parse(parsedData);
          } catch (e) {
            console.error('Failed to parse response_data:', e);
            parsedData = {};
          }
        }
        
        // Map field IDs to labels using template
        let mappedData = {};
        if (response.template_id && templates[response.template_id]) {
          const template = templates[response.template_id];
          const fields = template.fields || [];
          
          // Create a map of field IDs to labels
          const fieldMap = {};
          fields.forEach(field => {
            fieldMap[field.id] = field.label || field.id;
          });
          
          // Map the response data
          Object.entries(parsedData || {}).forEach(([fieldId, value]) => {
            const label = fieldMap[fieldId] || fieldId;
            mappedData[label] = value;
          });
        } else {
          mappedData = parsedData || {};
        }
        
        return {
          ...response,
          response_data: parsedData || {},
          mapped_data: mappedData,
          template: templates[response.template_id]
        };
      });
      
      setResponses(parsedResponses);
    } catch (error) {
      console.error('Error fetching responses:', error);
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
    setCreatingCandidate(true);
    try {
      const result = await candidateService.createCandidateFromResponse(responseId);
      
      toast.success(
        <div>
          Candidate created successfully!
          <br />
          <small>ID: {result.candidateId}</small>
        </div>
      );
      
      // Mark response as processed
      await markAsProcessed(responseId);
      
      // Refresh the list
      fetchResponses();
      setShowCreateCandidate(false);
      setSelectedResponse(null);
      
      // Optional: Open the candidate in a new tab
      if (result.candidateId) {
        const openCandidate = window.confirm('Candidate created! Do you want to view the candidate profile?');
        if (openCandidate) {
          // This will be handled by the candidate management component
          window.dispatchEvent(new CustomEvent('navigate', { 
            detail: { 
              view: 'candidateView',
              candidateId: result.candidateId
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error creating candidate:', error);
      
      if (error.message.includes('already exists')) {
        toast.error('A candidate with this email already exists');
      } else {
        toast.error(error.message || 'Failed to create candidate');
      }
    } finally {
      setCreatingCandidate(false);
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
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatFieldValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Not provided';
    }
    
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'Not provided';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };

  const getDisplayName = (response) => {
    if (response.candidate_name && response.candidate_name !== 'Unknown') {
      return response.candidate_name;
    }
    
    const data = response.mapped_data || response.response_data || {};
    return data['Name'] || data['Full Name'] || data.name || data.fullName || 'Unknown';
  };

  const getDisplayEmail = (response) => {
    if (response.candidate_email) return response.candidate_email;
    
    const data = response.mapped_data || response.response_data || {};
    return data['Email'] || data.email || 'No email';
  };

  if (loading) {
    return (
      <div className="response-list-loading">
        <div className="spinner"></div>
        <p>Loading responses...</p>
      </div>
    );
  }

  const pendingCount = responses.filter(r => !r.processed).length;
  const processedCount = responses.filter(r => r.processed).length;
  const candidatesCreated = responses.filter(r => r.candidate_id).length;

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
            Pending ({pendingCount})
          </button>
          <button
            className={`filter-btn ${filter === 'processed' ? 'active' : ''}`}
            onClick={() => setFilter('processed')}
          >
            Processed ({processedCount})
          </button>
          <button className="btn-export" onClick={exportToCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className="stats-bar" style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
        <span style={{ marginRight: '30px' }}>📊 Total: {responses.length}</span>
        <span style={{ marginRight: '30px' }}>⏳ Pending: {pendingCount}</span>
        <span style={{ marginRight: '30px' }}>✅ Processed: {processedCount}</span>
        <span>👤 Candidates Created: {candidatesCreated}</span>
      </div>

      {responses.length === 0 ? (
        <div className="no-responses">
          <p>No responses found</p>
        </div>
      ) : (
        <div className="response-grid">
          {responses.map(response => {
            const displayName = getDisplayName(response);
            const displayEmail = getDisplayEmail(response);
            const mappedData = response.mapped_data || {};
            
            return (
              <div key={response.id} className="response-card">
                <div className="response-card-header">
                  <h3>{displayName}</h3>
                  <div className="badges">
                    {!response.processed && <span className="badge new">New</span>}
                    {response.candidate_id && <span className="badge case">Candidate Created</span>}
                  </div>
                </div>
                
                <div className="response-card-body">
                  <p><strong>Email:</strong> {displayEmail}</p>
                  <p><strong>Submitted:</strong> {formatDate(response.submitted_at)}</p>
                  
                  {mappedData['Phone'] && (
                    <p><strong>Phone:</strong> {mappedData['Phone']}</p>
                  )}
                  {mappedData['Location'] && (
                    <p><strong>Location:</strong> {mappedData['Location']}</p>
                  )}
                  
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
                  
                  {!response.candidate_id && (
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
                  
                  {response.candidate_id && (
                    <button
                      className="btn-view-candidate"
                      style={{ background: '#28a745', color: 'white' }}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('navigate', { 
                          detail: { 
                            view: 'candidateView',
                            candidateId: response.candidate_id
                          }
                        }));
                      }}
                    >
                      View Candidate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
              <div className="response-header">
                <h3>{getDisplayName(selectedResponse)}</h3>
                <p>{getDisplayEmail(selectedResponse)}</p>
                {selectedResponse.submitted_at && (
                  <p className="submitted-info">
                    Submitted: {formatDate(selectedResponse.submitted_at)}
                  </p>
                )}
              </div>
              
              <div className="response-data">
                <h4>Form Responses:</h4>
                {(() => {
                  const dataToDisplay = selectedResponse.mapped_data || selectedResponse.response_data || {};
                  const entries = Object.entries(dataToDisplay);
                  
                  if (entries.length === 0) {
                    return <p className="no-data">No response data available</p>;
                  }
                  
                  return entries.map(([label, value]) => (
                    <div key={label} className="data-field">
                      <strong>{label}:</strong>
                      <span>{formatFieldValue(value)}</span>
                    </div>
                  ));
                })()}
              </div>
              
              {selectedResponse.processed && (
                <div className="processing-info">
                  <p>Processed by: {selectedResponse.processed_by}</p>
                  {selectedResponse.processed_at && (
                    <p>Processed at: {formatDate(selectedResponse.processed_at)}</p>
                  )}
                </div>
              )}
              
              {selectedResponse.candidate_id && (
                <div className="candidate-info" style={{ marginTop: '20px', padding: '15px', background: '#d4edda', borderRadius: '8px' }}>
                  <p style={{ color: '#155724', fontWeight: '600' }}>
                    ✅ Candidate profile created (ID: {selectedResponse.candidate_id})
                  </p>
                </div>
              )}
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
              {!selectedResponse.candidate_id && (
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
        <div className="modal-overlay" onClick={() => !creatingCandidate && setShowCreateCandidate(false)}>
          <div className="create-candidate-modal" onClick={e => e.stopPropagation()}>
            <h3>Create Candidate Profile</h3>
            <p>Create a candidate profile from this form response?</p>
            <div className="candidate-info">
              <p><strong>Name:</strong> {getDisplayName(selectedResponse)}</p>
              <p><strong>Email:</strong> {getDisplayEmail(selectedResponse)}</p>
              
              {(() => {
                const data = selectedResponse.mapped_data || {};
                return (
                  <>
                    {data['Phone'] && <p><strong>Phone:</strong> {data['Phone']}</p>}
                    {data['Phone Number'] && <p><strong>Phone:</strong> {data['Phone Number']}</p>}
                    {data['Location'] && <p><strong>Location:</strong> {data['Location']}</p>}
                    {data['Current Location'] && <p><strong>Location:</strong> {data['Current Location']}</p>}
                    {data['Visa Status'] && <p><strong>Visa:</strong> {data['Visa Status']}</p>}
                    {data['Skills'] && <p><strong>Skills:</strong> {formatFieldValue(data['Skills'])}</p>}
                    {data['Technical Skills'] && <p><strong>Skills:</strong> {formatFieldValue(data['Technical Skills'])}</p>}
                  </>
                );
              })()}
            </div>
            
            {creatingCandidate && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="spinner"></div>
                <p>Creating candidate profile...</p>
              </div>
            )}
            
            {!creatingCandidate && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseList;
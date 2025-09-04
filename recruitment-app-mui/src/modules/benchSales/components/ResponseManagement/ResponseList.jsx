// src/modules/benchSales/components/ResponseManagement/ResponseList.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import '../../styles/ResponseManagement.css';
import responseService from '../../services/responseService';
import formService from '../../services/formService';

const ResponseList = () => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCreateCandidate, setShowCreateCandidate] = useState(false);
  const [templateCache, setTemplateCache] = useState({});

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
            // Handle both direct template object and wrapped response
            const template = templateData.template || templateData;
            templates[templateId] = template;
            console.log(`Template ${templateId} fields:`, template.fields);
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
          
          console.log(`Response ${response.id} mapped data:`, mappedData);
        } else {
          // No template found, use raw data
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
      console.log('Parsed responses:', parsedResponses);
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

  // Get display name from mapped data
  const getDisplayName = (response) => {
    if (response.candidate_name && response.candidate_name !== 'Unknown') {
      return response.candidate_name;
    }
    
    const data = response.mapped_data || response.response_data || {};
    return data['Name'] || data['Full Name'] || data.name || data.fullName || 'Unknown';
  };

  // Get display email from mapped data
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
                    {!!response.case_created && <span className="badge case">Case Created</span>}
                  </div>
                </div>
                
                <div className="response-card-body">
                  <p><strong>Email:</strong> {displayEmail}</p>
                  <p><strong>Submitted:</strong> {formatDate(response.submitted_at)}</p>
                  {response.caseId && <p><strong>Case:</strong> {response.caseId}</p>}
                  
                  {/* Show preview of mapped fields */}
                  {mappedData['Phone'] && (
                    <p><strong>Phone:</strong> {mappedData['Phone']}</p>
                  )}
                  {mappedData['Location'] && (
                    <p><strong>Location:</strong> {mappedData['Location']}</p>
                  )}
                  
                  <button
                    className="btn-view-details"
                    onClick={() => {
                      console.log('Selected response:', response);
                      setSelectedResponse(response);
                    }}
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
                  // Use mapped data with proper field labels
                  const dataToDisplay = selectedResponse.mapped_data || selectedResponse.response_data || {};
                  const entries = Object.entries(dataToDisplay);
                  
                  if (entries.length === 0) {
                    return <p className="no-data">No response data available</p>;
                  }
                  
                  // If we have a template, sort by field order
                  let sortedEntries = entries;
                  if (selectedResponse.template && selectedResponse.template.fields) {
                    const fieldOrder = {};
                    selectedResponse.template.fields.forEach((field, index) => {
                      fieldOrder[field.label] = field.order || index;
                    });
                    
                    sortedEntries = entries.sort((a, b) => {
                      const orderA = fieldOrder[a[0]] !== undefined ? fieldOrder[a[0]] : 999;
                      const orderB = fieldOrder[b[0]] !== undefined ? fieldOrder[b[0]] : 999;
                      return orderA - orderB;
                    });
                  }
                  
                  return sortedEntries.map(([label, value]) => (
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
                    {data['Skills'] && <p><strong>Skills:</strong> {formatFieldValue(data['Skills'])}</p>}
                    {data['Technical Skills'] && <p><strong>Skills:</strong> {formatFieldValue(data['Technical Skills'])}</p>}
                  </>
                );
              })()}
            </div>
            
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
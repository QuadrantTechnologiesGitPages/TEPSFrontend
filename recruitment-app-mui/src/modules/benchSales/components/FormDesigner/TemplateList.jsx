// src/modules/benchSales/components/FormDesigner/TemplateList.jsx
import React, { useState, useEffect } from 'react';
import formService from '../../services/formService';
import toast from 'react-hot-toast';
import '../../styles/TemplateList.css';

const TemplateList = ({ onEditTemplate, onCreateNew }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await formService.getTemplates();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id, name) => {
    if (window.confirm(`Delete template "${name}"?`)) {
      try {
        await formService.deleteTemplate(id);
        toast.success('Template deleted');
        fetchTemplates();
      } catch (error) {
        toast.error('Failed to delete template');
      }
    }
  };

  const duplicateTemplate = async (template) => {
    try {
      const newTemplate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        fields: template.fields
      };
      
      await formService.createTemplate(newTemplate);
      toast.success('Template duplicated');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const sendForm = async () => {
    if (!selectedTemplate) return;
    
    const email = document.getElementById('candidateEmail').value;
    const name = document.getElementById('candidateName').value;
    const caseId = document.getElementById('caseId').value;
    
    if (!email) {
      toast.error('Email is required');
      return;
    }
    
    try {
      const result = await formService.sendForm({
        templateId: selectedTemplate.id,
        candidateEmail: email,
        candidateName: name,
        caseId: caseId
      });
      
      if (result.mailtoLink) {
        window.location.href = result.mailtoLink;
        toast.success('Opening email client...');
        setShowSendModal(false);
      }
    } catch (error) {
      toast.error('Failed to prepare email');
    }
  };

  if (loading) {
    return (
      <div className="template-list-loading">
        <div className="spinner"></div>
        <p>Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="template-list-container">
      <div className="template-list-header">
        <h2>Form Templates</h2>
        <button className="btn-create-new" onClick={onCreateNew}>
          + Create New Template
        </button>
      </div>
      
      {templates.length === 0 ? (
        <div className="no-templates">
          <p>No templates found</p>
          <button className="btn-create-first" onClick={onCreateNew}>
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="template-grid">
          {templates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-card-header">
                <h3>{template.name}</h3>
                {template.is_default && <span className="badge-default">Default</span>}
              </div>
              
              <p className="template-description">
                {template.description || 'No description'}
              </p>
              
              <div className="template-stats">
                <div className="stat">
                  <span className="stat-label">Fields:</span>
                  <span className="stat-value">{template.fields?.length || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Used:</span>
                  <span className="stat-value">{template.usage_count || 0} times</span>
                </div>
              </div>
              
              <div className="template-actions">
                <button 
                  className="btn-use-template" 
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowSendModal(true);
                  }}
                >
                  📧 Use Template
                </button>
                <button 
                  className="btn-edit" 
                  onClick={() => onEditTemplate(template)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn-duplicate"
                  onClick={() => duplicateTemplate(template)}
                >
                  📋 Duplicate
                </button>
                {!template.is_default && (
                  <button 
                    className="btn-delete"
                    onClick={() => deleteTemplate(template.id, template.name)}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Send Form Modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="send-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Form: {selectedTemplate?.name}</h3>
              <button className="close-btn" onClick={() => setShowSendModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Candidate Email *</label>
                <input 
                  type="email" 
                  id="candidateEmail" 
                  placeholder="candidate@email.com"
                />
              </div>
              <div className="form-group">
                <label>Candidate Name</label>
                <input 
                  type="text" 
                  id="candidateName" 
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Case ID (Optional)</label>
                <input 
                  type="text" 
                  id="caseId" 
                  placeholder="CASE-1234"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowSendModal(false)}>
                Cancel
              </button>
              <button className="btn-send" onClick={sendForm}>
                📧 Prepare Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateList;
// src/modules/benchSales/components/FormDesigner/FormDesigner.jsx
import React, { useState, useEffect } from 'react';
import FieldPalette from './FieldPalette';
import FieldEditor from './FieldEditor';
import FormPreview from './FormPreview';
import EmailComposer from './EmailComposer';
import '../../styles/FormDesigner.css';
import toast from 'react-hot-toast';
import formService from '../../services/formService';

const FormDesigner = ({ onClose, template = null }) => {
  const [formName, setFormName] = useState(template?.name || 'New Form Template');
  const [formDescription, setFormDescription] = useState(template?.description || '');
  const [fields, setFields] = useState(template?.fields || []);
  const [selectedField, setSelectedField] = useState(null);
  const [activeTab, setActiveTab] = useState('design'); // design, preview, send
  const [isSaving, setIsSaving] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [currentTemplateId, setCurrentTemplateId] = useState(template?.id || null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add field to form
  const addField = (fieldType) => {
    const newField = {
      id: `field_${Date.now()}`,
      label: `New ${fieldType} Field`,
      type: fieldType,
      required: false,
      placeholder: '',
      order: fields.length + 1,
      options: fieldType === 'select' || fieldType === 'radio' ? ['Option 1', 'Option 2'] : undefined
    };
    
    setFields([...fields, newField]);
    setSelectedField(newField);
    setHasUnsavedChanges(true);
  };

  // Update field properties
  const updateField = (fieldId, updates) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
    
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
    setHasUnsavedChanges(true);
  };

  // Delete field
  const deleteField = (fieldId) => {
    setFields(fields.filter(field => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
    setHasUnsavedChanges(true);
  };

  // Reorder fields
  const moveField = (fieldId, direction) => {
    const index = fields.findIndex(f => f.id === fieldId);
    const newFields = [...fields];
    
    if (direction === 'up' && index > 0) {
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }
    
    // Update order property
    newFields.forEach((field, idx) => {
      field.order = idx + 1;
    });
    
    setFields(newFields);
    setHasUnsavedChanges(true);
  };

  // Save template
  const saveTemplate = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a form name');
      return null;
    }
    
    if (fields.length === 0) {
      toast.error('Please add at least one field');
      return null;
    }
    
    setIsSaving(true);
    
    try {
      const templateData = {
        name: formName,
        description: formDescription,
        fields: fields,
        created_by: localStorage.getItem('userEmail') || 'system'
      };
      
      const data = currentTemplateId 
        ? await formService.updateTemplate(currentTemplateId, templateData)
        : await formService.createTemplate(templateData);
      
      if (data.success) {
        toast.success(currentTemplateId ? 'Template updated!' : 'Template created!');
        
        // Store the template ID for future use
        if (!currentTemplateId && (data.templateId || data.id)) {
          const newId = data.templateId || data.id;
          setCurrentTemplateId(newId);
        }
        
        setHasUnsavedChanges(false);
        
        // Return the data for use in sendToCandidate
        return data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save template');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Send form to candidate
  const sendToCandidate = async (candidateData) => {
    try {
      let templateIdToUse = currentTemplateId;
      
      // If no template ID exists or there are unsaved changes, save first
      if (!templateIdToUse || hasUnsavedChanges) {
        const saveResult = await saveTemplate();
        if (!saveResult || !saveResult.success) {
          toast.error('Failed to save template. Please try again.');
          return;
        }
        
        // Get the template ID from save result
        templateIdToUse = saveResult.templateId || saveResult.id || currentTemplateId;
        
        if (!templateIdToUse) {
          toast.error('Unable to determine template ID');
          return;
        }
      }
      
      // Set the candidate data
      setSelectedCandidate({
        ...candidateData,
        templateId: templateIdToUse
      });
      
      // Show email composer
      setShowEmailComposer(true);
      
    } catch (error) {
      console.error('Error sending to candidate:', error);
      toast.error('Failed to prepare form');
    }
  };

  // Track changes to form name and description
  useEffect(() => {
    if (template?.name !== formName || template?.description !== formDescription) {
      setHasUnsavedChanges(true);
    }
  }, [formName, formDescription]);

  return (
    <div className="form-designer-container">
      <div className="form-designer">
        {/* Header */}
        <div className="designer-header">
          <div className="header-left">
            <input
              type="text"
              className="form-name-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Form Template Name"
            />
            <input
              type="text"
              className="form-description-input"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            {hasUnsavedChanges && (
              <span className="unsaved-indicator" style={{ color: '#f6ad55', marginLeft: '10px' }}>
                • Unsaved changes
              </span>
            )}
          </div>
          <div className="header-right">
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="designer-tabs">
          <button 
            className={`tab ${activeTab === 'design' ? 'active' : ''}`}
            onClick={() => setActiveTab('design')}
          >
            🎨 Design
          </button>
          <button 
            className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            disabled={fields.length === 0}
          >
            👁️ Preview
          </button>
          <button 
            className={`tab ${activeTab === 'send' ? 'active' : ''}`}
            onClick={() => setActiveTab('send')}
            disabled={fields.length === 0}
          >
            📧 Send
          </button>
        </div>

        {/* Content */}
        <div className="designer-content">
          {activeTab === 'design' && (
            <div className="design-view">
              <div className="design-sidebar">
                <FieldPalette onAddField={addField} />
              </div>
              
              <div className="design-canvas">
                <h3>Form Fields</h3>
                {fields.length === 0 ? (
                  <div className="empty-state">
                    <p>No fields added yet</p>
                    <p>Click fields from the palette to add</p>
                  </div>
                ) : (
                  <div className="fields-list">
                    {fields.sort((a, b) => a.order - b.order).map((field) => (
                      <div 
                        key={field.id}
                        className={`field-item ${selectedField?.id === field.id ? 'selected' : ''}`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="field-header">
                          <span className="field-type-icon">
                            {field.type === 'text' && '📝'}
                            {field.type === 'email' && '✉️'}
                            {field.type === 'tel' && '📞'}
                            {field.type === 'select' && '📋'}
                            {field.type === 'textarea' && '📄'}
                            {field.type === 'date' && '📅'}
                            {field.type === 'file' && '📎'}
                            {field.type === 'url' && '🔗'}
                            {field.type === 'number' && '🔢'}
                            {field.type === 'radio' && '⭕'}
                            {field.type === 'checkbox' && '☑️'}
                          </span>
                          <span className="field-label">{field.label}</span>
                          {field.required && <span className="required-badge">*</span>}
                        </div>
                        <div className="field-actions">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(field.id, 'up');
                            }}
                            disabled={field.order === 1}
                          >
                            ↑
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(field.id, 'down');
                            }}
                            disabled={field.order === fields.length}
                          >
                            ↓
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteField(field.id);
                            }}
                            className="delete-btn"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="design-properties">
                {selectedField ? (
                  <FieldEditor
                    field={selectedField}
                    onUpdate={(updates) => updateField(selectedField.id, updates)}
                    onDelete={() => deleteField(selectedField.id)}
                  />
                ) : (
                  <div className="no-selection">
                    <p>Select a field to edit its properties</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'preview' && (
            <FormPreview 
              formName={formName}
              formDescription={formDescription}
              fields={fields}
            />
          )}
          
          {activeTab === 'send' && (
            <div className="send-view">
              <div className="send-options">
                <h3>Send Form to Candidate</h3>
                {hasUnsavedChanges && (
                  <div className="warning-message" style={{ 
                    background: '#fff5e6', 
                    padding: '10px', 
                    borderRadius: '5px',
                    marginBottom: '20px',
                    border: '1px solid #f6ad55'
                  }}>
                    ⚠️ You have unsaved changes. The form will be saved automatically before sending.
                  </div>
                )}
                <div className="candidate-input">
                  <input
                    type="email"
                    placeholder="Candidate Email"
                    id="candidateEmail"
                  />
                  <input
                    type="text"
                    placeholder="Candidate Name"
                    id="candidateName"
                  />
                  <input
                    type="text"
                    placeholder="Case ID (optional)"
                    id="caseId"
                  />
                  <button 
                    className="btn-send"
                    onClick={() => {
                      const email = document.getElementById('candidateEmail').value;
                      const name = document.getElementById('candidateName').value;
                      const caseId = document.getElementById('caseId').value;
                      
                      if (!email) {
                        toast.error('Please enter candidate email');
                        return;
                      }
                      
                      sendToCandidate({ email, name, caseId });
                    }}
                  >
                    📧 Prepare Email
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="designer-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-save"
            onClick={saveTemplate}
            disabled={isSaving || fields.length === 0}
          >
            {isSaving ? 'Saving...' : (currentTemplateId ? 'Update Template' : 'Save Template')}
          </button>
        </div>
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && (
        <EmailComposer
          template={{
            id: selectedCandidate?.templateId || currentTemplateId,
            name: formName,
            fields: fields
          }}
          candidate={selectedCandidate}
          onClose={() => {
            setShowEmailComposer(false);
            setSelectedCandidate(null);
          }}
        />
      )}
    </div>
  );
};

export default FormDesigner;
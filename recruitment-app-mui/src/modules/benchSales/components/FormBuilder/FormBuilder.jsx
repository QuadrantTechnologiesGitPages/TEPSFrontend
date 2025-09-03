// src/modules/benchSales/components/FormBuilder/FormBuilder.jsx
import React, { useState, useEffect } from 'react';
import { FormTemplate, FormField, FieldTypes } from '../../models/formTemplateModel';
import '../../styles/FormBuilder.css';

const FormBuilder = ({ template, onSave, onClose }) => {
  const [formTemplate, setFormTemplate] = useState(
    template || new FormTemplate()
  );
  const [selectedField, setSelectedField] = useState(null);

  const addField = () => {
    const newField = new FormField({
      label: 'New Field',
      type: FieldTypes.TEXT,
      order: formTemplate.fields.length + 1
    });
    
    setFormTemplate({
      ...formTemplate,
      fields: [...formTemplate.fields, newField]
    });
    setSelectedField(newField);
  };

  const updateField = (fieldId, updates) => {
    setFormTemplate({
      ...formTemplate,
      fields: formTemplate.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    });
  };

  const deleteField = (fieldId) => {
    setFormTemplate({
      ...formTemplate,
      fields: formTemplate.fields.filter(field => field.id !== fieldId)
    });
    setSelectedField(null);
  };

  const moveField = (fieldId, direction) => {
    const fields = [...formTemplate.fields];
    const index = fields.findIndex(f => f.id === fieldId);
    
    if (direction === 'up' && index > 0) {
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
    }
    
    setFormTemplate({ ...formTemplate, fields });
  };

  const handleSave = () => {
    const templates = JSON.parse(localStorage.getItem('formTemplates') || '[]');
    const existingIndex = templates.findIndex(t => t.id === formTemplate.id);
    
    if (existingIndex >= 0) {
      templates[existingIndex] = formTemplate;
    } else {
      templates.push(formTemplate);
    }
    
    localStorage.setItem('formTemplates', JSON.stringify(templates));
    onSave(formTemplate);
  };

  return (
    <div className="form-builder">
      <div className="builder-header">
        <h2>Form Template Builder</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="builder-content">
        <div className="template-info">
          <input
            type="text"
            placeholder="Template Name"
            value={formTemplate.name}
            onChange={(e) => setFormTemplate({ ...formTemplate, name: e.target.value })}
            className="template-name-input"
          />
          <textarea
            placeholder="Template Description"
            value={formTemplate.description}
            onChange={(e) => setFormTemplate({ ...formTemplate, description: e.target.value })}
            className="template-desc-input"
            rows="2"
          />
        </div>

        <div className="builder-workspace">
          <div className="fields-list">
            <h3>Form Fields</h3>
            <button className="add-field-btn" onClick={addField}>
              + Add Field
            </button>
            
            {formTemplate.fields.map((field, index) => (
              <div
                key={field.id}
                className={`field-item ${selectedField?.id === field.id ? 'selected' : ''}`}
                onClick={() => setSelectedField(field)}
              >
                <span className="field-label">{field.label}</span>
                <span className="field-type">{field.type}</span>
                {field.required && <span className="required-badge">*</span>}
                <div className="field-actions">
                  <button onClick={() => moveField(field.id, 'up')}>↑</button>
                  <button onClick={() => moveField(field.id, 'down')}>↓</button>
                  <button onClick={() => deleteField(field.id)}>×</button>
                </div>
              </div>
            ))}
          </div>

          {selectedField && (
            <div className="field-editor">
              <h3>Field Properties</h3>
              
              <div className="property-group">
                <label>Label</label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                />
              </div>

              <div className="property-group">
                <label>Field Type</label>
                <select
                  value={selectedField.type}
                  onChange={(e) => updateField(selectedField.id, { type: e.target.value })}
                >
                  {Object.entries(FieldTypes).map(([key, value]) => (
                    <option key={key} value={value}>{key}</option>
                  ))}
                </select>
              </div>

              <div className="property-group">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                  />
                  Required Field
                </label>
              </div>

              <div className="property-group">
                <label>Placeholder</label>
                <input
                  type="text"
                  value={selectedField.placeholder}
                  onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                />
              </div>

              {selectedField.type === FieldTypes.SELECT && (
                <div className="property-group">
                  <label>Options (one per line)</label>
                  <textarea
                    value={selectedField.options.join('\n')}
                    onChange={(e) => updateField(selectedField.id, { 
                      options: e.target.value.split('\n').filter(o => o.trim()) 
                    })}
                    rows="5"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="builder-footer">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>Save Template</button>
      </div>
    </div>
  );
};

export default FormBuilder;
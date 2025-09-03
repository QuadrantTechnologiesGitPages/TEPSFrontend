// src/modules/benchSales/components/FormDesigner/FormPreview.jsx
import React, { useState } from 'react';

const FormPreview = ({ formName, formDescription, fields }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleInputChange = (fieldId, value) => {
    setFormData({ ...formData, [fieldId]: value });
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    // Validate required fields
    fields.forEach(field => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Please fill in all required fields');
    } else {
      alert('Form is valid! (This is just a preview)');
    }
  };

  const renderField = (field) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
      case 'date':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'error' : ''}
            min={field.min}
            max={field.max}
            pattern={field.pattern}
          />
        );
        
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            className={error ? 'error' : ''}
          />
        );
        
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={error ? 'error' : ''}
          >
            <option value="">Select an option...</option>
            {(field.options || []).map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
        
      case 'radio':
        return (
          <div className="radio-group">
            {(field.options || []).map((option, idx) => (
              <label key={idx} className="radio-label">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
                {option}
              </label>
            ))}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="checkbox-group">
            {(field.options || []).map((option, idx) => (
              <label key={idx} className="checkbox-label">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option);
                    handleInputChange(field.id, newValues);
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        );
        
      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => handleInputChange(field.id, e.target.files[0])}
            accept={field.accept}
            className={error ? 'error' : ''}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="form-preview">
      <div className="preview-header">
        <h2>{formName || 'Untitled Form'}</h2>
        {formDescription && <p className="form-description">{formDescription}</p>}
        <div className="preview-badge">PREVIEW MODE</div>
      </div>
      
      <form onSubmit={handleSubmit} className="preview-form">
        {fields.sort((a, b) => (a.order || 0) - (b.order || 0)).map(field => (
          <div key={field.id} className="form-field">
            <label>
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            {renderField(field)}
            {field.helpText && <small className="help-text">{field.helpText}</small>}
            {errors[field.id] && <span className="error-message">{errors[field.id]}</span>}
          </div>
        ))}
        
        <div className="form-actions">
          <button type="submit" className="btn-submit">
            Submit (Preview)
          </button>
        </div>
      </form>
      
      <div className="preview-info">
        <p>ℹ️ This is a preview of how the form will appear to candidates</p>
        <p>📊 Total Fields: {fields.length} | Required: {fields.filter(f => f.required).length}</p>
      </div>
    </div>
  );
};

export default FormPreview;
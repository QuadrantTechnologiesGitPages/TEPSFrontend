// src/modules/benchSales/components/FormDesigner/FieldEditor.jsx
import React, { useState, useEffect } from 'react';

const FieldEditor = ({ field, onUpdate, onDelete }) => {
  const [localField, setLocalField] = useState(field);

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  const handleChange = (key, value) => {
    const updated = { ...localField, [key]: value };
    setLocalField(updated);
    onUpdate({ [key]: value });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...(localField.options || [])];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const addOption = () => {
    const newOptions = [...(localField.options || []), `Option ${(localField.options?.length || 0) + 1}`];
    handleChange('options', newOptions);
  };

  const removeOption = (index) => {
    const newOptions = localField.options.filter((_, i) => i !== index);
    handleChange('options', newOptions);
  };

  return (
    <div className="field-editor">
      <h3>Field Properties</h3>
      
      <div className="editor-section">
        <label>Field Label *</label>
        <input
          type="text"
          value={localField.label}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="Enter field label"
        />
      </div>

      <div className="editor-section">
        <label>Field ID (auto-generated)</label>
        <input
          type="text"
          value={localField.id}
          disabled
          className="disabled-input"
        />
      </div>

      <div className="editor-section">
        <label>Field Type</label>
        <input
          type="text"
          value={localField.type}
          disabled
          className="disabled-input"
        />
      </div>

      <div className="editor-section">
        <label>
          <input
            type="checkbox"
            checked={localField.required || false}
            onChange={(e) => handleChange('required', e.target.checked)}
          />
          Required Field
        </label>
      </div>

      {(localField.type !== 'select' && localField.type !== 'radio' && localField.type !== 'checkbox') && (
        <div className="editor-section">
          <label>Placeholder Text</label>
          <input
            type="text"
            value={localField.placeholder || ''}
            onChange={(e) => handleChange('placeholder', e.target.value)}
            placeholder="Enter placeholder text"
          />
        </div>
      )}

      {localField.type === 'textarea' && (
        <div className="editor-section">
          <label>Rows</label>
          <input
            type="number"
            value={localField.rows || 4}
            onChange={(e) => handleChange('rows', parseInt(e.target.value))}
            min="2"
            max="20"
          />
        </div>
      )}

      {localField.type === 'number' && (
        <>
          <div className="editor-section">
            <label>Min Value</label>
            <input
              type="number"
              value={localField.min || ''}
              onChange={(e) => handleChange('min', e.target.value)}
              placeholder="Minimum value"
            />
          </div>
          <div className="editor-section">
            <label>Max Value</label>
            <input
              type="number"
              value={localField.max || ''}
              onChange={(e) => handleChange('max', e.target.value)}
              placeholder="Maximum value"
            />
          </div>
        </>
      )}

      {localField.type === 'file' && (
        <div className="editor-section">
          <label>Accepted File Types</label>
          <input
            type="text"
            value={localField.accept || '.pdf,.doc,.docx'}
            onChange={(e) => handleChange('accept', e.target.value)}
            placeholder=".pdf,.doc,.docx"
          />
          <small>Comma-separated file extensions</small>
        </div>
      )}

      {(localField.type === 'select' || localField.type === 'radio' || localField.type === 'checkbox') && (
        <div className="editor-section">
          <label>Options</label>
          <div className="options-editor">
            {(localField.options || []).map((option, index) => (
              <div key={index} className="option-item">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
                <button
                  onClick={() => removeOption(index)}
                  className="btn-remove-option"
                  disabled={localField.options.length <= 2}
                >
                  ×
                </button>
              </div>
            ))}
            <button onClick={addOption} className="btn-add-option">
              + Add Option
            </button>
          </div>
        </div>
      )}

      <div className="editor-section">
        <label>Help Text</label>
        <input
          type="text"
          value={localField.helpText || ''}
          onChange={(e) => handleChange('helpText', e.target.value)}
          placeholder="Additional help for users"
        />
      </div>

      <div className="editor-section">
        <label>Validation Pattern (RegEx)</label>
        <input
          type="text"
          value={localField.pattern || ''}
          onChange={(e) => handleChange('pattern', e.target.value)}
          placeholder="e.g., ^[A-Z]{2}[0-9]{4}$"
        />
        <small>Advanced: Regular expression for validation</small>
      </div>

      <div className="editor-actions">
        <button onClick={onDelete} className="btn-delete-field">
          🗑️ Delete Field
        </button>
      </div>
    </div>
  );
};

export default FieldEditor;
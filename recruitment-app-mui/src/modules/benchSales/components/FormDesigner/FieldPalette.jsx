// src/modules/benchSales/components/FormDesigner/FieldPalette.jsx
import React from 'react';

const FieldPalette = ({ onAddField }) => {
  const fieldTypes = [
    { type: 'text', label: 'Text Input', icon: '📝', description: 'Single line text' },
    { type: 'email', label: 'Email', icon: '✉️', description: 'Email address' },
    { type: 'tel', label: 'Phone', icon: '📞', description: 'Phone number' },
    { type: 'textarea', label: 'Text Area', icon: '📄', description: 'Multi-line text' },
    { type: 'select', label: 'Dropdown', icon: '📋', description: 'Select from list' },
    { type: 'radio', label: 'Radio', icon: '⭕', description: 'Single choice' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑️', description: 'Multiple choices' },
    { type: 'date', label: 'Date', icon: '📅', description: 'Date picker' },
    { type: 'number', label: 'Number', icon: '🔢', description: 'Numeric input' },
    { type: 'url', label: 'URL', icon: '🔗', description: 'Web address' },
    { type: 'file', label: 'File Upload', icon: '📎', description: 'Upload files' }
  ];

  return (
    <div className="field-palette">
      <h3>Field Types</h3>
      <div className="field-types-list">
        {fieldTypes.map(field => (
          <div
            key={field.type}
            className="field-type-item"
            onClick={() => onAddField(field.type)}
            title={field.description}
          >
            <span className="field-icon">{field.icon}</span>
            <span className="field-label">{field.label}</span>
          </div>
        ))}
      </div>
      <div className="palette-tips">
        <p>💡 Click to add field</p>
      </div>
    </div>
  );
};

export default FieldPalette;
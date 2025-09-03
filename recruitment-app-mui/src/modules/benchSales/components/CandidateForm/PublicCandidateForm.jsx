// src/modules/benchSales/components/CandidateForm/PublicCandidateForm.jsx
import React, { useState, useEffect } from 'react';
import '../../styles/PublicForm.css';

const PublicCandidateForm = ({ token }) => {
  const [formData, setFormData] = useState({});
  const [submission, setSubmission] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadFormData();
  }, [token]);

  const loadFormData = () => {
    try {
      // Get submission by token
      const submissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]');
      const currentSubmission = submissions.find(s => s.token === token);
      
      if (!currentSubmission) {
        setError('Invalid or expired form link');
        setLoading(false);
        return;
      }

      // Check if already completed
      if (currentSubmission.status === 'completed') {
        setError('This form has already been submitted');
        setLoading(false);
        return;
      }

      // Check expiry
      if (new Date(currentSubmission.expiryDate) < new Date()) {
        setError('This form link has expired');
        setLoading(false);
        return;
      }

      // Get template
      const templates = JSON.parse(localStorage.getItem('formTemplates') || '[]');
      const formTemplate = templates.find(t => t.id === currentSubmission.templateId);
      
      if (!formTemplate) {
        setError('Form template not found');
        setLoading(false);
        return;
      }

      setSubmission(currentSubmission);
      setTemplate(formTemplate);
      
      // Initialize form data with saved responses if any
      const initialData = currentSubmission.responses || {};
      formTemplate.fields.forEach(field => {
        if (!initialData[field.id]) {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
      
      setLoading(false);
    } catch (err) {
      setError('Error loading form');
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData({ ...formData, [fieldId]: value });
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    template.fields.forEach(field => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
      
      // Email validation
      if (field.type === 'email' && formData[field.id]) {
        if (!/\S+@\S+\.\S+/.test(formData[field.id])) {
          newErrors[field.id] = 'Invalid email format';
        }
      }
      
      // Phone validation
      if (field.type === 'phone' && formData[field.id]) {
        if (!/^\d{10,}$/.test(formData[field.id].replace(/\D/g, ''))) {
          newErrors[field.id] = 'Invalid phone number';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    // Save progress
    const submissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]');
    const index = submissions.findIndex(s => s.token === token);
    
    if (index >= 0) {
      submissions[index].responses = formData;
      localStorage.setItem('formSubmissions', JSON.stringify(submissions));
      alert('Progress saved!');
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      alert('Please fill all required fields correctly');
      return;
    }

    try {
      // Update submission status
      const submissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]');
      const index = submissions.findIndex(s => s.token === token);
      
      if (index >= 0) {
        submissions[index].responses = formData;
        submissions[index].status = 'completed';
        submissions[index].completedDate = new Date().toISOString();
        localStorage.setItem('formSubmissions', JSON.stringify(submissions));
        
        // Update the case with the new information
        updateCaseWithFormData(submissions[index]);
        
        setSubmitted(true);
      }
    } catch (err) {
      alert('Error submitting form. Please try again.');
    }
  };

  const updateCaseWithFormData = (submission) => {
    const cases = JSON.parse(localStorage.getItem('cases') || '[]');
    const caseIndex = cases.findIndex(c => c.caseId === submission.caseId);
    
    if (caseIndex >= 0) {
      // Map form responses to case fields
      const responses = submission.responses;
      const updatedCase = { ...cases[caseIndex] };
      
      // Map common fields (you'll need to customize this based on your field mapping)
      template.fields.forEach(field => {
        const value = responses[field.id];
        
        // Simple mapping - customize based on your needs
        switch(field.label.toLowerCase()) {
          case 'full name':
            updatedCase.name = value;
            break;
          case 'email':
            updatedCase.email = value;
            break;
          case 'phone':
            updatedCase.phone = value;
            break;
          case 'linkedin profile':
            updatedCase.linkedIn = value;
            break;
          case 'current location':
            updatedCase.location = value;
            break;
          case 'visa status':
            updatedCase.visa = value;
            break;
          case 'years of experience':
            updatedCase.yearsExp = value;
            break;
          case 'skills':
            updatedCase.skills = value.split(',').map(s => s.trim());
            break;
          case 'education':
            updatedCase.education = value;
            break;
        }
      });
      
      // Add activity log
      updatedCase.activities = updatedCase.activities || [];
      updatedCase.activities.push({
        id: Date.now(),
        type: 'form_completed',
        description: 'Candidate completed information form',
        timestamp: new Date().toISOString()
      });
      
      cases[caseIndex] = updatedCase;
      localStorage.setItem('cases', JSON.stringify(cases));
    }
  };

  const renderField = (field) => {
    switch(field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={errors[field.id] ? 'error' : ''}
          />
        );
      
      case 'select':
        return (
          <select
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={errors[field.id] ? 'error' : ''}
          >
            <option value="">Select {field.label}</option>
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows="4"
            className={errors[field.id] ? 'error' : ''}
          />
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="public-form-container">
        <div className="loading">Loading form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-form-container">
        <div className="error-message">
          <h2>⚠️ {error}</h2>
          <p>Please contact your recruiter for assistance.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-container">
        <div className="success-message">
          <h2>✅ Thank You!</h2>
          <p>Your information has been submitted successfully.</p>
          <p>We will review your information and get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <div className="public-form">
        <div className="form-header">
          <h1>Candidate Information Form</h1>
          <p>Please fill out all required fields marked with *</p>
        </div>

        <div className="form-body">
          {template.fields.sort((a, b) => a.order - b.order).map(field => (
            <div key={field.id} className="form-field">
              <label>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              {renderField(field)}
              {errors[field.id] && (
                <span className="error-message">{errors[field.id]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="form-footer">
          <button className="btn-save" onClick={handleSave}>
            Save Progress
          </button>
          <button className="btn-submit" onClick={handleSubmit}>
            Submit Form
          </button>
        </div>

        <div className="form-info">
          <p>Your progress is automatically saved. You can return to this form using the same link.</p>
          <p>This form will expire on {new Date(submission.expiryDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default PublicCandidateForm;
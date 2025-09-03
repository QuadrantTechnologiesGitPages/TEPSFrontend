// src/modules/benchSales/components/CandidateForm/PublicCandidateForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import formService from '../../services/formService';
import responseService from '../../services/responseService';
import '../../styles/PublicForm.css';

const PublicCandidateForm = () => {
  const { token } = useParams(); // Get token from URL params
  const [formData, setFormData] = useState({});
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      loadFormData();
    }
  }, [token]);

const loadFormData = async () => {
  try {
    setLoading(true);
    
    // Check if this form was already submitted (stored in localStorage)
    const submittedForms = JSON.parse(localStorage.getItem('submitted_forms') || '[]');
    if (submittedForms.includes(token)) {
      setSubmitted(true);
      setLoading(false);
      return;
    }
    
    const response = await formService.getFormByToken(token);
    
    if (response.success && response.form) {
      setFormConfig(response.form);
      
      // Initialize form data
      const initialData = {};
      response.form.fields.forEach(field => {
        initialData[field.id] = '';
      });
      setFormData(initialData);
    } else {
      setError(response.error || 'Failed to load form');
    }
  } catch (err) {
    console.error('Error loading form:', err);
    if (err.message === 'Form not found') {
      setError('Invalid or expired form link');
    } else if (err.message === 'Form has expired') {
      setError('This form link has expired');
    } else if (err.message === 'Form already submitted') {
      setSubmitted(true); // Show success message instead of error
    } else {
      setError('Error loading form. Please try again.');
    }
  } finally {
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
    
    formConfig.fields.forEach(field => {
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
      if (field.type === 'tel' && formData[field.id]) {
        if (!/^\d{10,}$/.test(formData[field.id].replace(/\D/g, ''))) {
          newErrors[field.id] = 'Invalid phone number';
        }
      }
      
      // URL validation
      if (field.type === 'url' && formData[field.id]) {
        try {
          new URL(formData[field.id]);
        } catch {
          newErrors[field.id] = 'Invalid URL format';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setSaving(true);
    // In a real implementation, you might want to save to localStorage or sessionStorage
    localStorage.setItem(`form_progress_${token}`, JSON.stringify(formData));
    setTimeout(() => {
      setSaving(false);
      alert('Progress saved locally! You can close and return to this form later.');
    }, 500);
  };

const handleSubmit = async () => {
  if (!validateForm()) {
    // Show specific field errors instead of generic alert
    const firstError = Object.values(errors)[0];
    setShowSuccess(false);
    // Scroll to first error field
    const firstErrorField = document.querySelector('.error');
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  try {
    setSubmitting(true);
    
    const result = await responseService.submitResponse(token, formData);
    
    if (result.success) {
      // Store that this form was submitted
      const submittedForms = JSON.parse(localStorage.getItem('submitted_forms') || '[]');
      submittedForms.push(token);
      localStorage.setItem('submitted_forms', JSON.stringify(submittedForms));
      
      // Clear saved progress
      localStorage.removeItem(`form_progress_${token}`);
      
      // Show success with animation
      setSubmitted(true);
      setShowSuccess(true);
    } else {
      throw new Error(result.error || 'Failed to submit form');
    }
  } catch (err) {
    console.error('Error submitting form:', err);
    // Show inline error instead of alert
    setError(err.message || 'Error submitting form. Please try again.');
    setTimeout(() => setError(''), 5000); // Clear error after 5 seconds
  } finally {
    setSubmitting(false);
  }
};

  const renderField = (field) => {
    switch(field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'date':
      case 'number':
        return (
          <input
            type={field.type}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={errors[field.id] ? 'error' : ''}
            min={field.min}
            max={field.max}
            pattern={field.pattern}
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
            {(field.options || []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
        
      case 'radio':
        return (
          <div className="radio-group">
            {(field.options || []).map(option => (
              <label key={option} className="radio-label">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={formData[field.id] === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                />
                {option}
              </label>
            ))}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="checkbox-group">
            {(field.options || []).map(option => (
              <label key={option} className="checkbox-label">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(formData[field.id]) ? formData[field.id].includes(option) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option);
                    handleFieldChange(field.id, newValues);
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        );
      
      case 'textarea':
        return (
          <textarea
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            className={errors[field.id] ? 'error' : ''}
          />
        );
        
      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => handleFieldChange(field.id, e.target.files[0])}
            accept={field.accept}
            className={errors[field.id] ? 'error' : ''}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={errors[field.id] ? 'error' : ''}
          />
        );
    }
  };

  // Load saved progress if exists
  useEffect(() => {
    if (formConfig && token) {
      const savedProgress = localStorage.getItem(`form_progress_${token}`);
      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          setFormData(parsed);
        } catch (e) {
          console.error('Error loading saved progress');
        }
      }
    }
  }, [formConfig, token]);

  if (loading) {
    return (
      <div className="public-form-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading form...</p>
        </div>
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
      <div className={`success-message ${showSuccess ? 'animate-in' : ''}`}>
        <div className="success-icon">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" stroke="#4CAF50" strokeWidth="2" fill="none"/>
            <path d="M20 40 L32 52 L60 24" stroke="#4CAF50" strokeWidth="3" fill="none" 
                  strokeLinecap="round" strokeLinejoin="round"
                  className="checkmark"/>
          </svg>
        </div>
        <h2>Thank You!</h2>
        <p className="main-message">Your information has been submitted successfully.</p>
        <div className="next-steps">
          <h3>What happens next?</h3>
          <ul>
            <li>Our team will review your information within 24-48 hours</li>
            <li>You'll receive a confirmation email at the address you provided</li>
            <li>A recruiter will contact you if your profile matches our requirements</li>
          </ul>
        </div>
        <p className="contact-info">
          If you have any questions, please contact your recruiter or email us at recruitment@company.com
        </p>
      </div>
    </div>
  );
}


  return (
    <div className="public-form-container">
      <div className="public-form">
        <div className="form-header">
          <h1>{formConfig?.candidateName ? `Form for ${formConfig.candidateName}` : 'Candidate Information Form'}</h1>
          <p>Please fill out all required fields marked with *</p>
        </div>

        <div className="form-body">
          {formConfig?.fields?.sort((a, b) => (a.order || 0) - (b.order || 0)).map(field => (
            <div key={field.id} className="form-field">
              <label>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              {renderField(field)}
              {field.helpText && <small className="help-text">{field.helpText}</small>}
              {errors[field.id] && (
                <span className="error-message">{errors[field.id]}</span>
              )}
            </div>

          ))}
          {error && !loading && (
          <div className="inline-error">
            <span>⚠️ {error}</span>
          </div>
        )}
        </div>

        <div className="form-footer">
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
          <button 
            className="btn-submit" 
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Form'}
          </button>
        </div>

        <div className="form-info">
          <p>Your progress is automatically saved locally. You can return to this form using the same link.</p>
          {formConfig?.expiresAt && (
            <p>This form will expire on {new Date(formConfig.expiresAt).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicCandidateForm;
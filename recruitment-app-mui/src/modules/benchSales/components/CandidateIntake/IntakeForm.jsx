// src/modules/benchSales/components/CandidateIntake/IntakeForm.jsx - UPDATED WITH OAUTH FLOW
import React, { useState, useEffect } from 'react';
import { useCases } from '../../contexts/CaseContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { Case } from '../../models/caseModel';
import SkillSelector from './SkillSelector';
import DuplicateChecker from './DuplicateChecker';
import '../../styles/Intake.css';
import '../../styles/EmailOptions.css';

const IntakeForm = ({ editMode = false, candidateData = null, onClose }) => {
  const { createCase, updateCase } = useCases();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    phone: '',
    location: '',
    visa: '',
    
    // Professional
    linkedIn: '',
    yearsExp: '',
    skills: [],
    currentEmployer: '',
    
    // Education
    education: '',
    degree: '',
    institution: '',
    graduationYear: '',
    certifications: [],
    
    // Referral
    referredBy: '',
    referralSource: '',
    notes: '',
    
    // Additional
    priority: 3,
    currentStatus: 'Active'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailOptions, setShowEmailOptions] = useState(false);
  const [emailProvider, setEmailProvider] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Load existing data if editing
  useEffect(() => {
    if (editMode && candidateData) {
      setFormData({ ...formData, ...candidateData });
    }
  }, [editMode, candidateData]);

  // Check if user has OAuth tokens stored
  useEffect(() => {
    checkOAuthStatus();
  }, []);

  const checkOAuthStatus = () => {
    const googleToken = localStorage.getItem('google_oauth_token');
    const microsoftToken = localStorage.getItem('microsoft_oauth_token');
    
    if (googleToken || microsoftToken) {
      setIsAuthenticated(true);
      setEmailProvider(googleToken ? 'google' : 'microsoft');
    }
  };

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!editMode) {
        localStorage.setItem('intakeFormDraft', JSON.stringify(formData));
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [formData, editMode]);

  // Load draft on mount
  useEffect(() => {
    if (!editMode) {
      const draft = localStorage.getItem('intakeFormDraft');
      if (draft) {
        const draftData = JSON.parse(draft);
        setFormData(draftData);
      }
    }
  }, []);

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch(step) {
      case 1:
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (!formData.phone) newErrors.phone = 'Phone is required';
        if (!formData.visa) newErrors.visa = 'Visa status is required';
        break;
        
      case 2:
        if (!formData.linkedIn) newErrors.linkedIn = 'LinkedIn URL is required';
        else if (!formData.linkedIn.includes('linkedin.com')) {
          newErrors.linkedIn = 'Invalid LinkedIn URL';
        }
        if (!formData.yearsExp) newErrors.yearsExp = 'Experience is required';
        if (formData.skills.length === 0) newErrors.skills = 'At least one skill is required';
        break;
        
      case 3:
        if (!formData.education) newErrors.education = 'Education is required';
        break;
        
      case 4:
        if (!formData.referredBy) newErrors.referredBy = 'Referrer name is required';
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleOAuthLogin = (provider) => {
    // Open OAuth popup window
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const authUrl = provider === 'google' 
      ? '/api/auth/google'
      : '/api/auth/microsoft';
    
    const authWindow = window.open(
      `http://localhost:5000${authUrl}`,
      'OAuth Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for OAuth callback
    const checkAuth = setInterval(() => {
      try {
        if (authWindow.closed) {
          clearInterval(checkAuth);
          checkOAuthStatus();
        }
      } catch (e) {
        // Cross-origin error means the window is still on the OAuth provider
      }
    }, 1000);
  };

  const handleSendForm = async () => {
    setSendingEmail(true);
    
    try {
      // Create the case first
      const newCase = new Case(formData);
      const savedCase = createCase(formData, user);
      
      // Prepare form template for candidate
      const formTemplate = {
        caseId: savedCase.caseId,
        candidateEmail: formData.email,
        senderEmail: user.email,
        fields: [
          { id: 'name', label: 'Full Name', type: 'text', required: true, value: formData.name },
          { id: 'email', label: 'Email', type: 'email', required: true, value: formData.email },
          { id: 'phone', label: 'Phone', type: 'phone', required: true, value: formData.phone },
          { id: 'linkedIn', label: 'LinkedIn Profile', type: 'text', required: true },
          { id: 'location', label: 'Current Location', type: 'text', required: false },
          { id: 'visa', label: 'Visa Status', type: 'select', required: true, 
            options: ['H1B', 'OPT-EAD', 'GC-EAD', 'Green Card', 'US Citizen'] },
          { id: 'yearsExp', label: 'Years of Experience', type: 'select', required: true,
            options: ['0-2 years', '2-5 years', '5-8 years', '8-10 years', '10+ years'] },
          { id: 'skills', label: 'Technical Skills', type: 'textarea', required: true },
          { id: 'education', label: 'Education', type: 'select', required: true,
            options: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD'] },
          { id: 'currentEmployer', label: 'Current Employer', type: 'text', required: false },
        ]
      };
      
      // Send form via API
      const response = await fetch('http://localhost:5000/api/forms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(`${emailProvider}_oauth_token`)}`
        },
        body: JSON.stringify(formTemplate)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Store submission record
        const submissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]');
        submissions.push({
          id: Date.now().toString(),
          token: result.token,
          caseId: savedCase.caseId,
          candidateEmail: formData.email,
          status: 'pending',
          sentDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        localStorage.setItem('formSubmissions', JSON.stringify(submissions));
        
        // Clear draft
        localStorage.removeItem('intakeFormDraft');
        
        alert('✅ Case created and form sent to candidate successfully!');
        if (onClose) onClose();
        
        // Navigate to cases view
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'cases' }}));
      } else {
        throw new Error('Failed to send form');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error sending form. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setShowEmailOptions(true);
  };

  const handleSaveWithoutEmail = () => {
    setIsSubmitting(true);
    
    try {
      if (editMode) {
        updateCase(candidateData.caseId, formData, user);
      } else {
        createCase(formData, user);
        localStorage.removeItem('intakeFormDraft');
      }
      
      alert(editMode ? 'Case updated successfully!' : 'New case created successfully!');
      if (onClose) onClose();
      window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'cases' }}));
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['Basic Info', 'Professional', 'Education', 'Referral', 'Review'];
    
    return (
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`step ${currentStep === index + 1 ? 'active' : ''} ${currentStep > index + 1 ? 'completed' : ''}`}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-label">{step}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="form-step">
            <h2>Basic Information</h2>
            
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>
            
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
            
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
            
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                placeholder="City, State"
              />
            </div>
            
            <div className="form-group">
              <label>Visa Status *</label>
              <select
                value={formData.visa}
                onChange={(e) => handleFieldChange('visa', e.target.value)}
                className={errors.visa ? 'error' : ''}
              >
                <option value="">Select Visa Status</option>
                <option value="H1B">H1B</option>
                <option value="OPT-EAD">OPT-EAD</option>
                <option value="GC-EAD">GC-EAD</option>
                <option value="F1">F1</option>
                <option value="Citizen">US Citizen</option>
                <option value="GC">Green Card</option>
              </select>
              {errors.visa && <span className="error-message">{errors.visa}</span>}
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="form-step">
            <h2>Professional Details</h2>
            
            <div className="form-group">
              <label>LinkedIn Profile URL *</label>
              <input
                type="url"
                value={formData.linkedIn}
                onChange={(e) => handleFieldChange('linkedIn', e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className={errors.linkedIn ? 'error' : ''}
              />
              {errors.linkedIn && <span className="error-message">{errors.linkedIn}</span>}
            </div>
            
            <div className="form-group">
              <label>Years of Experience *</label>
              <select
                value={formData.yearsExp}
                onChange={(e) => handleFieldChange('yearsExp', e.target.value)}
                className={errors.yearsExp ? 'error' : ''}
              >
                <option value="">Select Experience</option>
                <option value="0-1 years">0-1 years</option>
                <option value="1-3 years">1-3 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="5-8 years">5-8 years</option>
                <option value="8-10 years">8-10 years</option>
                <option value="10+ years">10+ years</option>
              </select>
              {errors.yearsExp && <span className="error-message">{errors.yearsExp}</span>}
            </div>
            
            <div className="form-group">
              <label>Skills * (Press Enter to add)</label>
              <SkillSelector
                skills={formData.skills}
                onChange={(skills) => handleFieldChange('skills', skills)}
                error={errors.skills}
              />
              {errors.skills && <span className="error-message">{errors.skills}</span>}
            </div>
            
            <div className="form-group">
              <label>Current Employer</label>
              <input
                type="text"
                value={formData.currentEmployer}
                onChange={(e) => handleFieldChange('currentEmployer', e.target.value)}
                placeholder="Company name"
              />
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="form-step">
            <h2>Education & Verification</h2>
            
            <div className="form-group">
              <label>Highest Education *</label>
              <select
                value={formData.education}
                onChange={(e) => handleFieldChange('education', e.target.value)}
                className={errors.education ? 'error' : ''}
              >
                <option value="">Select Education</option>
                <option value="High School">High School</option>
                <option value="Associate">Associate Degree</option>
                <option value="Bachelor">Bachelor's Degree</option>
                <option value="Master">Master's Degree</option>
                <option value="PhD">PhD</option>
              </select>
              {errors.education && <span className="error-message">{errors.education}</span>}
            </div>
            
            <div className="form-group">
              <label>Degree/Field of Study</label>
              <input
                type="text"
                value={formData.degree}
                onChange={(e) => handleFieldChange('degree', e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>
            
            <div className="form-group">
              <label>Institution</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => handleFieldChange('institution', e.target.value)}
                placeholder="University/College name"
              />
            </div>
            
            <div className="form-group">
              <label>Graduation Year</label>
              <input
                type="number"
                value={formData.graduationYear}
                onChange={(e) => handleFieldChange('graduationYear', e.target.value)}
                placeholder="YYYY"
                min="1950"
                max={new Date().getFullYear()}
              />
            </div>
            
            <div className="form-group">
              <label>Certifications (Optional)</label>
              <textarea
                value={formData.certifications.join('\n')}
                onChange={(e) => handleFieldChange('certifications', e.target.value.split('\n').filter(c => c))}
                placeholder="Enter each certification on a new line"
                rows="3"
              />
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="form-step">
            <h2>Referral Information</h2>
            
            <div className="form-group">
              <label>Referred By *</label>
              <input
                type="text"
                value={formData.referredBy}
                onChange={(e) => handleFieldChange('referredBy', e.target.value)}
                placeholder="Referrer's name"
                className={errors.referredBy ? 'error' : ''}
              />
              {errors.referredBy && <span className="error-message">{errors.referredBy}</span>}
            </div>
            
            <div className="form-group">
              <label>How did they hear about us?</label>
              <select
                value={formData.referralSource}
                onChange={(e) => handleFieldChange('referralSource', e.target.value)}
              >
                <option value="">Select Source</option>
                <option value="Employee Referral">Employee Referral</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Job Portal">Job Portal</option>
                <option value="Company Website">Company Website</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Any additional information about the candidate"
                rows="4"
              />
            </div>
            
            <div className="form-group">
              <label>Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => handleFieldChange('priority', parseInt(e.target.value))}
              >
                <option value="1">Critical</option>
                <option value="2">High</option>
                <option value="3">Medium</option>
                <option value="4">Low</option>
              </select>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="form-step">
            <h2>Review & Submit</h2>
            
            <div className="review-section">
              <h3>Basic Information</h3>
              <div className="review-item">
                <span className="review-label">Name:</span>
                <span className="review-value">{formData.name}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Email:</span>
                <span className="review-value">{formData.email}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Phone:</span>
                <span className="review-value">{formData.phone}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Location:</span>
                <span className="review-value">{formData.location || 'Not specified'}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Visa Status:</span>
                <span className="review-value">{formData.visa}</span>
              </div>
            </div>
            
            <div className="review-section">
              <h3>Professional Details</h3>
              <div className="review-item">
                <span className="review-label">LinkedIn:</span>
                <span className="review-value">{formData.linkedIn}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Experience:</span>
                <span className="review-value">{formData.yearsExp}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Skills:</span>
                <span className="review-value">{formData.skills.join(', ')}</span>
              </div>
            </div>
            
            <div className="review-section">
              <h3>Education</h3>
              <div className="review-item">
                <span className="review-label">Education Level:</span>
                <span className="review-value">{formData.education}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Degree:</span>
                <span className="review-value">{formData.degree || 'Not specified'}</span>
              </div>
            </div>
            
            <div className="review-section">
              <h3>Referral</h3>
              <div className="review-item">
                <span className="review-label">Referred By:</span>
                <span className="review-value">{formData.referredBy}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Priority:</span>
                <span className="review-value">
                  {['Critical', 'High', 'Medium', 'Low'][formData.priority - 1]}
                </span>
              </div>
            </div>
            
            <DuplicateChecker email={formData.email} phone={formData.phone} />
          </div>
        );    
      
      default:
        return null;
    }
  };

  // Email Options Modal
  const renderEmailOptions = () => {
    if (!showEmailOptions) return null;
    
    return (
      <div className="email-options-overlay">
        <div className="email-options-modal">
          <h3>📧 Send Information Request to Candidate?</h3>
          <p>Would you like to send a form to {formData.name} to complete their information?</p>
          
          {!isAuthenticated ? (
            <div className="oauth-options">
              <p>Please authenticate with your email provider:</p>
              <div className="oauth-buttons">
                <button 
                  className="oauth-btn google"
                  onClick={() => handleOAuthLogin('google')}
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" />
                  Login with Google
                </button>
                <button 
                  className="oauth-btn microsoft"
                  onClick={() => handleOAuthLogin('microsoft')}
                >
                  <img src="https://www.microsoft.com/favicon.ico" alt="Microsoft" />
                  Login with Microsoft
                </button>
              </div>
            </div>
          ) : (
            <div className="send-options">
              <p>✅ Authenticated with {emailProvider === 'google' ? 'Gmail' : 'Outlook'}</p>
              <div className="action-buttons">
                <button 
                  className="btn btn-primary"
                  onClick={handleSendForm}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? 'Sending...' : 'Send Form & Create Case'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleSaveWithoutEmail}
                >
                  Create Case Without Sending
                </button>
                <button 
                  className="btn btn-cancel"
                  onClick={() => setShowEmailOptions(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="intake-form-container">
        <div className="intake-form">
          <div className="form-header">
            <h1>{editMode ? 'Edit Candidate' : 'New Candidate Intake'}</h1>
            {onClose && (
              <button className="close-btn" onClick={onClose}>×</button>
            )}
          </div>
          
          {renderStepIndicator()}
          
          <div className="form-content">
            {renderCurrentStep()}
          </div>
          
          <div className="form-footer">
            {currentStep > 1 && (
              <button 
                className="btn btn-secondary"
                onClick={handlePrevious}
              >
                Previous
              </button>
            )}
            
            {currentStep < 5 ? (
              <button 
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next
              </button>
            ) : (
              <button 
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Complete Intake'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {renderEmailOptions()}
    </>
  );
};

export default IntakeForm;
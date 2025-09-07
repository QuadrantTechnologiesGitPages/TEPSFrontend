// recruitment-app-mui/src/modules/benchSales/components/CandidateManagement/CandidateForm.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import candidateService from '../../services/candidateService';
import '../../styles/CandidateManagement.css';

const CandidateForm = ({ candidateId, onNavigate, onCancel }) => {
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    
    // Professional Info
    current_location: '',
    visa_status: '',
    years_experience: '',
    skills: [],
    education: '',
    current_employer: '',
    
    // Additional Info
    availability: '',
    expected_salary: '',
    notes: '',
    resume_url: '',
    
    // Tracking Info
    status: 'Active',
    referred_by: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Visa Status Options
  const visaStatusOptions = [
    'H1B',
    'OPT-EAD',
    'GC-EAD',
    'Green Card',
    'US Citizen',
    'L1',
    'L2-EAD',
    'TN',
    'E3',
    'Other'
  ];

  // Status Options
  const statusOptions = [
    'Active',
    'Inactive',
    'Placed',
    'On Hold'
  ];

  // Availability Options
  const availabilityOptions = [
    'Immediate',
    '1 Week',
    '2 Weeks',
    '1 Month',
    'Not Available'
  ];

  useEffect(() => {
    if (candidateId) {
      setIsEditMode(true);
      fetchCandidateData();
    }
  }, [candidateId]);

  const fetchCandidateData = async () => {
    setLoading(true);
    try {
      const data = await candidateService.getCandidateById(candidateId);
      const candidate = data.candidate || data;
      
      // Parse skills if they're a JSON string
      let skills = candidate.skills || [];
      if (typeof skills === 'string') {
        try {
          skills = JSON.parse(skills);
        } catch {
          skills = skills.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      
      setFormData({
        ...candidate,
        skills: Array.isArray(skills) ? skills : []
      });
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate data');
      if (onCancel) onCancel();
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim();
      
      if (!formData.skills.includes(newSkill)) {
        setFormData(prev => ({
          ...prev,
          skills: [...prev.skills, newSkill]
        }));
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Optional field validations
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }
    
    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      newErrors.linkedin_url = 'Invalid LinkedIn URL';
    }
    
    if (formData.years_experience && isNaN(formData.years_experience)) {
      newErrors.years_experience = 'Must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setSaving(true);
    try {
      // Prepare data
      const dataToSubmit = {
        ...formData,
        skills: JSON.stringify(formData.skills)
      };
      
      let result;
      if (isEditMode) {
        result = await candidateService.updateCandidate(candidateId, dataToSubmit);
        toast.success('Candidate updated successfully');
      } else {
        result = await candidateService.createCandidate(dataToSubmit);
        toast.success('Candidate created successfully');
      }
      
      // Navigate to candidate view
      const newCandidateId = result.candidateId || result.id || candidateId;
      if (onNavigate) {
        onNavigate('candidateView', { candidateId: newCandidateId });
      } else {
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: {
            view: 'candidateView',
            candidateId: newCandidateId
          }
        }));
      }
    } catch (error) {
      console.error('Error saving candidate:', error);
      
      if (error.message?.includes('already exists')) {
        setErrors({ email: 'A candidate with this email already exists' });
        toast.error('Email already exists');
      } else {
        toast.error(error.message || 'Failed to save candidate');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onNavigate) {
      onNavigate('candidateList');
    } else {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { view: 'candidateList' }
      }));
    }
  };

  if (loading) {
    return (
      <div className="form-loading">
        <div className="spinner"></div>
        <p>Loading candidate data...</p>
      </div>
    );
  }

  return (
    <div className="candidate-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Edit Candidate' : 'Create New Candidate'}</h2>
        <button className="btn-close" onClick={handleCancel}>×</button>
      </div>

      <form onSubmit={handleSubmit} className="candidate-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? 'error' : ''}
                placeholder="John Doe"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
                placeholder="john.doe@example.com"
                disabled={isEditMode}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
              {isEditMode && (
                <small className="field-note">Email cannot be changed after creation</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={errors.phone ? 'error' : ''}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="linkedin_url">LinkedIn Profile</label>
              <input
                type="url"
                id="linkedin_url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleInputChange}
                className={errors.linkedin_url ? 'error' : ''}
                placeholder="https://linkedin.com/in/johndoe"
              />
              {errors.linkedin_url && <span className="error-message">{errors.linkedin_url}</span>}
            </div>
          </div>
        </div>

        {/* Professional Information Section */}
        <div className="form-section">
          <h3>Professional Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="current_location">Current Location</label>
              <input
                type="text"
                id="current_location"
                name="current_location"
                value={formData.current_location}
                onChange={handleInputChange}
                placeholder="City, State"
              />
            </div>

            <div className="form-group">
              <label htmlFor="visa_status">Visa Status</label>
              <select
                id="visa_status"
                name="visa_status"
                value={formData.visa_status}
                onChange={handleInputChange}
              >
                <option value="">Select Visa Status</option>
                {visaStatusOptions.map(visa => (
                  <option key={visa} value={visa}>{visa}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="years_experience">Years of Experience</label>
              <input
                type="text"
                id="years_experience"
                name="years_experience"
                value={formData.years_experience}
                onChange={handleInputChange}
                className={errors.years_experience ? 'error' : ''}
                placeholder="5"
              />
              {errors.years_experience && <span className="error-message">{errors.years_experience}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="current_employer">Current Employer</label>
              <input
                type="text"
                id="current_employer"
                name="current_employer"
                value={formData.current_employer}
                onChange={handleInputChange}
                placeholder="Company Name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="education">Education</label>
              <input
                type="text"
                id="education"
                name="education"
                value={formData.education}
                onChange={handleInputChange}
                placeholder="Bachelor's in Computer Science"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="skills">Technical Skills</label>
              <div className="skills-input-container">
                <input
                  type="text"
                  id="skillInput"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  placeholder="Type a skill and press Enter"
                />
                <div className="skills-list">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="remove-skill"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="form-section">
          <h3>Additional Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="availability">Availability</label>
              <select
                id="availability"
                name="availability"
                value={formData.availability}
                onChange={handleInputChange}
              >
                <option value="">Select Availability</option>
                {availabilityOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="expected_salary">Expected Salary</label>
              <input
                type="text"
                id="expected_salary"
                name="expected_salary"
                value={formData.expected_salary}
                onChange={handleInputChange}
                placeholder="$100,000 - $120,000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="referred_by">Referred By</label>
              <input
                type="text"
                id="referred_by"
                name="referred_by"
                value={formData.referred_by}
                onChange={handleInputChange}
                placeholder="Referrer name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="resume_url">Resume URL</label>
              <input
                type="url"
                id="resume_url"
                name="resume_url"
                value={formData.resume_url}
                onChange={handleInputChange}
                placeholder="Link to resume"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="4"
                placeholder="Additional notes about the candidate..."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-small"></span>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update Candidate' : 'Create Candidate'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CandidateForm;
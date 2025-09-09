import React, { useState } from 'react';

const JDMatcher = ({ onMatch, loading }) => {
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (jobDescription.trim().length > 50) {
      onMatch(jobDescription);
    }
  };

  const sampleJD = `We are looking for a Senior Full Stack Developer with 5+ years of experience.

Required Skills:
- Strong experience with React, Node.js, and TypeScript
- Experience with cloud platforms (AWS/Azure)
- Knowledge of microservices architecture
- Experience with SQL and NoSQL databases

Requirements:
- Bachelor's degree in Computer Science or related field
- Must be located in Toronto or willing to relocate
- Canadian citizen or permanent resident preferred
- Excellent communication skills

Nice to have:
- Experience with Python and machine learning
- DevOps experience with Docker and Kubernetes
- Agile/Scrum experience`;

  const handleUseSample = () => {
    setJobDescription(sampleJD);
  };

  return (
    <div className="jd-matcher">
      <form onSubmit={handleSubmit}>
        <div className="jd-input-wrapper">
          <label className="jd-label">
            Paste Job Description
            <button 
              type="button" 
              className="sample-btn"
              onClick={handleUseSample}
              disabled={loading}
            >
              Use Sample JD
            </button>
          </label>
          <textarea
            className="jd-textarea"
            placeholder="Paste the complete job description here. Our AI will analyze it and find the best matching candidates..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
            disabled={loading}
          />
          <div className="jd-actions">
            <span className="char-count">
              {jobDescription.length} characters
              {jobDescription.length < 50 && jobDescription.length > 0 && (
                <span className="warning"> (minimum 50 required)</span>
              )}
            </span>
            <button 
              type="submit" 
              className="match-btn"
              disabled={loading || jobDescription.trim().length < 50}
            >
              {loading ? 'Analyzing & Matching...' : '🎯 Find Matching Candidates'}
            </button>
          </div>
        </div>
      </form>

      <div className="jd-tips">
        <h4>💡 Tips for better matches:</h4>
        <ul>
          <li>Include specific technical skills and technologies</li>
          <li>Mention required years of experience</li>
          <li>Specify location and visa requirements</li>
          <li>Add nice-to-have skills for better ranking</li>
        </ul>
      </div>
    </div>
  );
};

export default JDMatcher;
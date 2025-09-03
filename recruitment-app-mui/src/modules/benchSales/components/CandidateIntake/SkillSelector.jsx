// src/modules/benchSales/components/CandidateIntake/SkillSelector.jsx
import React, { useState } from 'react';

const SkillSelector = ({ skills, onChange, error }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const commonSkills = [
    'JavaScript', 'React', 'Angular', 'Vue.js', 'Node.js',
    'Python', 'Java', 'C#', '.NET', 'Spring Boot',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'DevOps',
    'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'Machine Learning', 'Data Science', 'AI', 'TensorFlow',
    'Salesforce', 'SAP', 'Oracle', 'ServiceNow'
  ];
  
  const filteredSuggestions = commonSkills.filter(skill =>
    skill.toLowerCase().includes(inputValue.toLowerCase()) &&
    !skills.includes(skill)
  );
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addSkill(inputValue.trim());
    }
  };
  
  const addSkill = (skill) => {
    if (!skills.includes(skill)) {
      onChange([...skills, skill]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };
  
  const removeSkill = (skillToRemove) => {
    onChange(skills.filter(skill => skill !== skillToRemove));
  };
  
  return (
    <div className="skills-input-container">
      <div className="skills-selected">
        {skills.map((skill, index) => (
          <div key={index} className="skill-tag">
            {skill}
            <button onClick={() => removeSkill(skill)}>×</button>
          </div>
        ))}
      </div>
      
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder="Type skill and press Enter"
        className={error ? 'error' : ''}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="skill-suggestions">
          {filteredSuggestions.slice(0, 5).map((skill, index) => (
            <div
              key={index}
              className="skill-suggestion"
              onMouseDown={() => addSkill(skill)}
            >
              {skill}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillSelector;
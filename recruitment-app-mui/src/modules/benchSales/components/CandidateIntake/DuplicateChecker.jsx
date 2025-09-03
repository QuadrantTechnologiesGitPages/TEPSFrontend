// src/modules/benchSales/components/CandidateIntake/DuplicateChecker.jsx
import React, { useEffect, useState } from 'react';

const DuplicateChecker = ({ email, phone }) => {
  const [duplicates, setDuplicates] = useState([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (email || phone) {
      checkForDuplicates();
    }
  }, [email, phone]);

  const checkForDuplicates = () => {
    setChecking(true);
    
    // Get existing cases from localStorage
    const existingCases = JSON.parse(localStorage.getItem('cases') || '[]');
    
    const foundDuplicates = existingCases.filter(caseItem => {
      const emailMatch = email && caseItem.email?.toLowerCase() === email.toLowerCase();
      const phoneMatch = phone && caseItem.phone === phone;
      return emailMatch || phoneMatch;
    });
    
    setDuplicates(foundDuplicates);
    setChecking(false);
  };

  if (checking) {
    return (
      <div className="duplicate-check">
        <p>Checking for duplicates...</p>
      </div>
    );
  }

  if (duplicates.length === 0) {
    return (
      <div style={{ 
        background: '#f0fdf4', 
        border: '1px solid #86efac',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <p style={{ color: '#166534', margin: 0 }}>
          ✓ No duplicate candidates found
        </p>
      </div>
    );
  }

  return (
    <div className="duplicate-check">
      <h4>⚠️ Possible Duplicates Found</h4>
      <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
        The following candidates have matching email or phone:
      </p>
      {duplicates.map((dup, index) => (
        <div key={index} className="duplicate-item">
          <strong>{dup.name}</strong> - {dup.caseId}
          <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '5px' }}>
            {dup.email === email && <div>Email: {dup.email}</div>}
            {dup.phone === phone && <div>Phone: {dup.phone}</div>}
            <div>Status: {dup.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DuplicateChecker;
// src/modules/benchSales/contexts/CaseContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Case, CaseStatus } from '../models/caseModel';

const CaseContext = createContext();

export const useCases = () => {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCases must be used within CaseProvider');
  }
  return context;
};

export const CaseProvider = ({ children }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    priority: '',
    search: ''
  });

  // Load cases from localStorage on mount
  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = () => {
    try {
      const storedCases = localStorage.getItem('cases');
      if (storedCases) {
        setCases(JSON.parse(storedCases));
      }
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCases = (updatedCases) => {
    setCases(updatedCases);
    localStorage.setItem('cases', JSON.stringify(updatedCases));
  };

  const createCase = (candidateData, user) => {
    const newCase = new Case(candidateData);
    newCase.assignedTo = user?.email;
    newCase.addActivity('case_created', 'Case created', user?.email);
    
    const updatedCases = [...cases, newCase];
    saveCases(updatedCases);
    return newCase;
  };

  const updateCase = (caseId, updates, user) => {
    const updatedCases = cases.map(c => {
      if (c.caseId === caseId) {
        const updatedCase = { ...c, ...updates, modifiedDate: new Date().toISOString() };
        if (updates.status && updates.status !== c.status) {
          updatedCase.activities = [...(c.activities || []), {
            id: Date.now(),
            type: 'status_change',
            description: `Status changed from ${c.status} to ${updates.status}`,
            user: user?.email,
            timestamp: new Date().toISOString()
          }];
        }
        return updatedCase;
      }
      return c;
    });
    saveCases(updatedCases);
  };

  const addNoteToCase = (caseId, note, user) => {
    const updatedCases = cases.map(c => {
      if (c.caseId === caseId) {
        return {
          ...c,
          notes: [...(c.notes || []), {
            id: Date.now(),
            content: note,
            user: user?.email,
            timestamp: new Date().toISOString()
          }],
          modifiedDate: new Date().toISOString()
        };
      }
      return c;
    });
    saveCases(updatedCases);
  };

  const getCaseById = (caseId) => {
    return cases.find(c => c.caseId === caseId);
  };

  const getFilteredCases = () => {
    return cases.filter(c => {
      if (filters.status && c.status !== filters.status) return false;
      if (filters.assignedTo && c.assignedTo !== filters.assignedTo) return false;
      if (filters.priority && c.priority !== parseInt(filters.priority)) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          c.name?.toLowerCase().includes(searchLower) ||
          c.caseId?.toLowerCase().includes(searchLower) ||
          c.skills?.some(s => s.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  };

  const getCaseStats = () => {
    const stats = {
      total: cases.length,
      active: cases.filter(c => c.status === CaseStatus.INTAKE || 
                               c.status === CaseStatus.VERIFICATION_IN_PROGRESS).length,
      pendingVerification: cases.filter(c => c.status === CaseStatus.VERIFICATION_PENDING).length,
      submitted: cases.filter(c => c.status === CaseStatus.SUBMITTED).length,
      placed: cases.filter(c => c.status === CaseStatus.PLACED).length
    };
    return stats;
  };

  const value = {
    cases,
    loading,
    filters,
    setFilters,
    createCase,
    updateCase,
    addNoteToCase,
    getCaseById,
    getFilteredCases,
    getCaseStats,
    loadCases
  };

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
};
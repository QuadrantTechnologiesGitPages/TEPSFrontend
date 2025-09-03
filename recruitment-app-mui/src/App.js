// src/App.js - COMPLETE FILE WITH CANDIDATE FORM SUPPORT
import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Layout from './components/common/Layout.jsx';
import SearchBar from './components/search/SearchBar.jsx';
import SearchFilters from './components/search/SearchFilters.jsx';
import CandidateList from './components/candidates/CandidateList.jsx';
import CandidateDetails from './components/candidates/CandidateDetails.jsx';
import MessageComposer from './components/communication/MessageComposer.jsx';
import BenchSalesDashboard from './modules/benchSales/components/Dashboard/BenchSalesDashboard';
import { CaseProvider } from './modules/benchSales/contexts/CaseContext';
import CaseList from './modules/benchSales/components/CaseManagement/CaseList';
import CaseDetails from './modules/benchSales/components/CaseManagement/CaseDetails';
import IntakeForm from './modules/benchSales/components/CandidateIntake/IntakeForm';
import FormBuilder from './modules/benchSales/components/FormBuilder/FormBuilder';
import SendFormModal from './modules/benchSales/components/FormBuilder/SendFormModal';
import PublicCandidateForm from './modules/benchSales/components/CandidateForm/PublicCandidateForm';
import { mockCandidates } from './data/mockData';
import { searchCandidates } from './utils/candidateMatcher';

function AppContent() {
  const { isAuthenticated, user, roles, logout, hasRole } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [filters, setFilters] = useState({
    visa: '',
    status: '',
    location: '',
    experience: ''
  });
  const [searchResults, setSearchResults] = useState(mockCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageType, setMessageType] = useState('');
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [intakeEditData, setIntakeEditData] = useState(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendFormCase, setSendFormCase] = useState(null);
  const [isPublicForm, setIsPublicForm] = useState(false);

  // Always call hooks in the same order
  const isBenchSales = hasRole('BenchSales');
  const isLeadership = hasRole('Leadership');
  const isRecruitment = hasRole('Recruitment');

  useEffect(() => {
    // Check if this is a candidate form URL (public access)
    if (window.location.pathname.startsWith('/candidate-form/')) {
      setIsPublicForm(true);
      setCurrentView('candidateForm');
      return;
    }

    // Initialize cases in localStorage if not exists
    if (!localStorage.getItem('cases')) {
      const initialCases = mockCandidates.map((candidate, index) => ({
        ...candidate,
        caseId: `CASE-${1000 + index}`,
        status: candidate.currentStatus,
        assignedTo: null,
        createdDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        verificationStatus: Math.random() > 0.5 ? 'Completed' : 'Pending',
        slaDeadline: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        activities: [],
        notes: [],
        verification: {
          status: 'Not Started',
          linkedIn: { verified: false, date: null, notes: '' },
          education: { verified: false, date: null, notes: '' },
          experience: { verified: false, date: null, notes: '' },
          references: { verified: false, date: null, notes: '' }
        }
      }));
      localStorage.setItem('cases', JSON.stringify(initialCases));
    }
  }, []);

  useEffect(() => {
    // Determine initial view based on role
    if (isAuthenticated && !isPublicForm) {
      if (isBenchSales) {
        setCurrentView('benchSalesDashboard');
      } else if (isLeadership) {
        setCurrentView('search');
      } else if (isRecruitment) {
        setCurrentView('recruitment');
      } else {
        setCurrentView('search'); // Default
      }
    }
  }, [isAuthenticated, isBenchSales, isLeadership, isRecruitment, isPublicForm]);

  useEffect(() => {
    const handleNavigation = (e) => {
      if (e.detail?.view) {
        if (e.detail.view === 'intake') {
          setShowIntakeForm(true);
          setIntakeEditData(null);
        } else if (e.detail.view === 'formBuilder') {
          setShowFormBuilder(true);
        } else {
          setCurrentView(e.detail.view);
        }
      }
    };
    window.addEventListener('navigate', handleNavigation);
    return () => window.removeEventListener('navigate', handleNavigation);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    const results = searchCandidates(query, filters, mockCandidates);
    setSearchResults(results);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    const results = searchCandidates(searchQuery, newFilters, mockCandidates);
    setSearchResults(results);
  };

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setTimeout(() => setSelectedCandidate(null), 300);
  };

  const handleOpenMessage = (type, candidate) => {
    setSelectedCandidate(candidate || selectedCandidate);
    setMessageType(type);
    setMessageOpen(true);
    if (detailsOpen) setDetailsOpen(false);
  };

  const handleCloseMessage = () => {
    setMessageOpen(false);
    setTimeout(() => setMessageType(''), 300);
  };

  const handleEditCase = (caseData) => {
    setIntakeEditData(caseData);
    setShowIntakeForm(true);
  };

  const handleSendForm = (caseData) => {
    setSendFormCase(caseData);
    setShowSendForm(true);
  };

  // If this is a public form, render it without authentication
  if (isPublicForm) {
    const pathParts = window.location.pathname.split('/');
    const formToken = pathParts[pathParts.length - 1];
    return <PublicCandidateForm token={formToken} />;
  }

  // Move the early return AFTER all hooks
  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'benchSalesDashboard':
        return <BenchSalesDashboard />;
      
      case 'cases':
        return (
          <>
            <CaseList 
              onEditCase={handleEditCase}
              onSendForm={handleSendForm}
            />
            {selectedCaseId && (
              <CaseDetails 
                caseId={selectedCaseId}
                onClose={() => setSelectedCaseId(null)}
              />
            )}
          </>
        );
      
      case 'search':
        return (
          <>
            <div className="search-section">
              <SearchBar onSearch={handleSearch} />
              <SearchFilters 
                filters={filters} 
                onFilterChange={handleFilterChange} 
              />
            </div>

            <div className="results-section">
              <h2 className="results-header">
                Top Matches ({searchResults.length})
              </h2>
              <CandidateList 
                candidates={searchResults}
                onViewDetails={handleViewDetails}
              />
            </div>
          </>
        );
      
      default:
        return (
          <div className="coming-soon">
            <h2>Module Under Construction</h2>
            <p>This module is being developed.</p>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="app-navigation">
        <div className="nav-tabs">
          {isBenchSales && (
            <>
              <button 
                className={`nav-tab ${currentView === 'benchSalesDashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('benchSalesDashboard')}
              >
                Dashboard
              </button>
              <button 
                className={`nav-tab ${currentView === 'cases' ? 'active' : ''}`}
                onClick={() => setCurrentView('cases')}
              >
                Cases
              </button>
              <button 
                className="nav-tab"
                onClick={() => setShowFormBuilder(true)}
              >
                Form Templates
              </button>
            </>
          )}
          <button 
            className={`nav-tab ${currentView === 'search' ? 'active' : ''}`}
            onClick={() => setCurrentView('search')}
          >
            Search & Match
          </button>
        </div>
        <div className="user-info-bar">
          <span>Role: {roles.join(', ')}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      {renderView()}

      {selectedCandidate && (
        <>
          <CandidateDetails
            candidate={selectedCandidate}
            isOpen={detailsOpen}
            onClose={handleCloseDetails}
            onContactReferrer={() => handleOpenMessage('referrer', selectedCandidate)}
            onContactCandidate={() => handleOpenMessage('candidate', selectedCandidate)}
          />

          <MessageComposer
            isOpen={messageOpen}
            onClose={handleCloseMessage}
            type={messageType}
            candidate={selectedCandidate}
          />
        </>
      )}

      {showIntakeForm && (
        <IntakeForm
          editMode={!!intakeEditData}
          candidateData={intakeEditData}
          onClose={() => {
            setShowIntakeForm(false);
            setIntakeEditData(null);
          }}
        />
      )}

      {showFormBuilder && (
        <FormBuilder
          template={null}
          onSave={(template) => {
            setShowFormBuilder(false);
          }}
          onClose={() => setShowFormBuilder(false)}
        />
      )}

      {showSendForm && sendFormCase && (
        <SendFormModal
          caseData={sendFormCase}
          onClose={() => {
            setShowSendForm(false);
            setSendFormCase(null);
          }}
        />
      )}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <CaseProvider>
        <AppContent />
      </CaseProvider>
    </AuthProvider>
  );
}

export default App;
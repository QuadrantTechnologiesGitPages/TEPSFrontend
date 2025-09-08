// src/App.js - UPDATED WITH FIXED CANDIDATE MANAGEMENT NAVIGATION
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Form system imports
import FormDesigner from './modules/benchSales/components/FormDesigner/FormDesigner';
import TemplateList from './modules/benchSales/components/FormDesigner/TemplateList';
import ResponseList from './modules/benchSales/components/ResponseManagement/ResponseList';
import PublicCandidateForm from './modules/benchSales/components/CandidateForm/PublicCandidateForm';

// NEW: Candidate Management imports
import CandidateManagementList from './modules/benchSales/components/CandidateManagement/CandidateList';
import CandidateForm from './modules/benchSales/components/CandidateManagement/CandidateForm';
import CandidateView from './modules/benchSales/components/CandidateManagement/CandidateView';

import { Toaster } from 'react-hot-toast';
import { mockCandidates } from './data/mockData';
import { searchCandidates } from './utils/candidateMatcher';

// Public Form Wrapper Component
function PublicFormWrapper() {
  const pathParts = window.location.pathname.split('/');
  const token = pathParts[pathParts.length - 1];
  return <PublicCandidateForm token={token} />;
}

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
  
  // New states for FormDesigner
  const [showFormDesigner, setShowFormDesigner] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showResponses, setShowResponses] = useState(false);
  
  // NEW: States for Candidate Management
  const [candidateManagementView, setCandidateManagementView] = useState('list');
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);

  // Always call hooks in the same order
  const isBenchSales = hasRole('BenchSales');
  const isLeadership = hasRole('Leadership');
  const isRecruitment = hasRole('Recruitment');

  useEffect(() => {
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

    // Store user email for API calls
    if (user?.email) {
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userName', user.name || user.email.split('@')[0]);
    }
  }, [user]);

  useEffect(() => {
    // Determine initial view based on role
    if (isAuthenticated) {
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
  }, [isAuthenticated, isBenchSales, isLeadership, isRecruitment]);

  useEffect(() => {
    const handleNavigation = (e) => {
      if (e.detail?.view) {
        switch (e.detail.view) {
          case 'formDesigner':
            setShowFormDesigner(true);
            break;
          case 'responses':
            setShowResponses(true);
            break;
          case 'templates':
            setCurrentView('templates');
            break;
          // NEW: Handle candidate management navigation
          case 'candidateList':
            setCurrentView('candidates');
            setCandidateManagementView('list');
            setSelectedCandidateId(null);
            break;
          case 'candidateCreate':
            setCurrentView('candidates');
            setCandidateManagementView('create');
            setSelectedCandidateId(null);
            break;
          case 'candidateEdit':
            setCurrentView('candidates');
            setCandidateManagementView('edit');
            setSelectedCandidateId(e.detail.candidateId);
            break;
          case 'candidateView':
            setCurrentView('candidates');
            setCandidateManagementView('view');
            setSelectedCandidateId(e.detail.candidateId);
            break;
          default:
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

  // Handler for QuickActions
  const handleQuickAction = (action) => {
    switch (action) {
      case 'newIntake':
        setShowFormDesigner(true);
        setEditingTemplate(null);
        break;
      case 'viewResponses':
        setShowResponses(true);
        break;
      case 'templates':
        setCurrentView('templates');
        break;
      default:
        break;
    }
  };

  // FIXED: Handler for candidate management navigation
  const handleCandidateNavigation = (view, params) => {
    console.log('Navigating to:', view, 'with params:', params); // Debug log
    
    // Normalize view names
    switch(view) {
      case 'candidateView':
      case 'view':
        setCandidateManagementView('view');
        setSelectedCandidateId(params?.candidateId);
        break;
      case 'candidateEdit':
      case 'edit':
        setCandidateManagementView('edit');
        setSelectedCandidateId(params?.candidateId);
        break;
      case 'candidateCreate':
      case 'create':
        setCandidateManagementView('create');
        setSelectedCandidateId(null);
        break;
      case 'candidateList':
      case 'list':
        setCandidateManagementView('list');
        setSelectedCandidateId(null);
        break;
      default:
        console.warn('Unknown navigation view:', view);
        setCandidateManagementView('list');
        setSelectedCandidateId(null);
    }
  };

  // Move the early return AFTER all hooks
  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'benchSalesDashboard':
        return (
          <BenchSalesDashboard 
            onQuickAction={handleQuickAction}
          />
        );
      
      case 'cases':
        return (
          <>
            <CaseList 
              onSendForm={(caseData) => {
                // Open FormDesigner with case context
                setEditingTemplate({ caseId: caseData.caseId });
                setShowFormDesigner(true);
              }}
            />
            {selectedCaseId && (
              <CaseDetails 
                caseId={selectedCaseId}
                onClose={() => setSelectedCaseId(null)}
              />
            )}
          </>
        );

      case 'responses':
        return <ResponseList />;

      case 'templates':
        return (
          <TemplateList
            onEditTemplate={(template) => {
              setEditingTemplate(template);
              setShowFormDesigner(true);
            }}
            onCreateNew={() => {
              setEditingTemplate(null);
              setShowFormDesigner(true);
            }}
          />
        );
      
      // FIXED: Candidate Management views with proper navigation
      case 'candidates':
        if (candidateManagementView === 'list') {
          return (
            <CandidateManagementList 
              onNavigate={(view, params) => {
                console.log('CandidateList navigation:', view, params); // Debug
                handleCandidateNavigation(view, params);
              }}
            />
          );
        } else if (candidateManagementView === 'create') {
          return (
            <CandidateForm 
              onNavigate={(view, params) => {
                console.log('CandidateForm navigation:', view, params); // Debug
                handleCandidateNavigation(view, params);
              }}
              onCancel={() => handleCandidateNavigation('list')}
            />
          );
        } else if (candidateManagementView === 'edit') {
          return (
            <CandidateForm 
              candidateId={selectedCandidateId}
              onNavigate={(view, params) => {
                console.log('CandidateForm edit navigation:', view, params); // Debug
                handleCandidateNavigation(view, params);
              }}
              onCancel={() => handleCandidateNavigation('list')}
            />
          );
        } else if (candidateManagementView === 'view') {
          return (
            <CandidateView 
              candidateId={selectedCandidateId}
              onNavigate={(view, params) => {
                console.log('CandidateView navigation:', view, params); // Debug
                // Handle special case where edit is called from view
                if (view === 'candidateEdit' || view === 'edit') {
                  // If no candidateId in params, use the current one
                  handleCandidateNavigation(view, { 
                    candidateId: params?.candidateId || selectedCandidateId 
                  });
                } else {
                  handleCandidateNavigation(view, params);
                }
              }}
            />
          );
        }
        // Return null if no matching view
        return null;
      
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
                className={`nav-tab ${currentView === 'candidates' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('candidates');
                  setCandidateManagementView('list');
                  setSelectedCandidateId(null);
                }}
              >
                Candidates
              </button>
              <button 
                className={`nav-tab ${currentView === 'responses' ? 'active' : ''}`}
                onClick={() => setCurrentView('responses')}
              >
                Form Responses
              </button>
              <button 
                className={`nav-tab ${currentView === 'templates' ? 'active' : ''}`}
                onClick={() => setCurrentView('templates')}
              >
                Templates
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

      {/* Form Designer Modal */}
      {showFormDesigner && (
        <FormDesigner
          template={editingTemplate}
          onClose={(result) => {
            setShowFormDesigner(false);
            setEditingTemplate(null);
            // Refresh templates if saved
            if (result?.success && currentView === 'templates') {
              // Force re-render of TemplateList by toggling view
              setCurrentView('');
              setTimeout(() => setCurrentView('templates'), 0);
            }
          }}
        />
      )}

      {/* Response List Modal */}
      {showResponses && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div className="modal-header">
              <h2>Form Responses</h2>
              <button 
                className="close-btn"
                onClick={() => setShowResponses(false)}
              >
                ×
              </button>
            </div>
            <ResponseList />
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: 'green',
            },
          },
          error: {
            style: {
              background: 'red',
            },
          },
        }}
      />
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CaseProvider>
          <Routes>
            <Route path="/candidate-form/:token" element={
              <>
                <PublicFormWrapper />
                <Toaster position="top-right" />
              </>
            } />
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </CaseProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
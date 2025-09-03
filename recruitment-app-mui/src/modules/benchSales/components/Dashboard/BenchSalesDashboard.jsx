// src/modules/benchSales/components/Dashboard/BenchSalesDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import DashboardMetrics from './DashboardMetrics';
import ActiveCases from './ActiveCases';
import QuickActions from './QuickActions';
import '../../styles/Dashboard.css';

const BenchSalesDashboard = ({ onQuickAction }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    activeCases: 0,
    pendingVerification: 0,
    todayFollowups: 0,
    weeklySubmissions: 0,
    unreadResponses: 0  // New metric for form responses
  });
  const [activeCases, setActiveCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Check for form responses
    checkFormResponses();
  }, []);

  const loadDashboardData = () => {
    // For now, using localStorage and mock data
    const storedCases = JSON.parse(localStorage.getItem('cases') || '[]');
    const today = new Date().toDateString();
    
    // Calculate metrics
    const active = storedCases.filter(c => c.status === 'Active').length;
    const pending = storedCases.filter(c => 
      c.verificationStatus === 'Pending'
    ).length;
    const followups = storedCases.filter(c => 
      c.nextFollowup && new Date(c.nextFollowup).toDateString() === today
    ).length;
    
    setMetrics(prev => ({
      ...prev,
      activeCases: active,
      pendingVerification: pending,
      todayFollowups: followups,
      weeklySubmissions: 0
    }));
    
    // Get active cases for display
    const myCases = storedCases
      .filter(c => c.assignedTo === user?.email || !c.assignedTo)
      .filter(c => c.status !== 'Closed')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
    
    setActiveCases(myCases);
    setLoading(false);
  };

  const checkFormResponses = async () => {
    try {
      // Check for unread responses from the backend
      const response = await fetch('/api/responses?processed=false', {
        headers: {
          'x-user-email': user?.email || 'system'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(prev => ({
          ...prev,
          unreadResponses: data.count || 0
        }));
      }
    } catch (error) {
      console.log('Could not fetch response count');
    }
  };

  const handleQuickAction = (action) => {
    // If onQuickAction prop is provided (from App.js), use it
    if (onQuickAction) {
      onQuickAction(action);
      return;
    }
    
    // Otherwise, handle internally
    switch(action) {
      case 'newIntake':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'formDesigner' }}));
        break;
      case 'viewResponses':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'responses' }}));
        break;
      case 'searchCandidate':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'search' }}));
        break;
      case 'viewAllCases':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'cases' }}));
        break;
      case 'templates':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'templates' }}));
        break;
      case 'pendingVerifications':
        // Filter to show only pending verifications
        window.dispatchEvent(new CustomEvent('navigate', { 
          detail: { 
            view: 'cases',
            filter: 'pendingVerification'
          }
        }));
        break;
      default:
        console.log('Action:', action);
    }
  };

  // Set up WebSocket for real-time notifications
  useEffect(() => {
    if (!user?.email) return;
    
    // Connect to WebSocket for real-time updates
    const ws = new WebSocket(`ws://localhost:5000/ws`);
    
    ws.onopen = () => {
      // Register user for notifications
      ws.send(JSON.stringify({
        type: 'register',
        userEmail: user.email
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'form_response') {
        // Update unread responses count
        setMetrics(prev => ({
          ...prev,
          unreadResponses: prev.unreadResponses + 1
        }));
        
        // Show notification (if you have a notification system)
        console.log('New form response received:', data);
      }
    };
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user?.email]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bench-sales-dashboard">
      <div className="dashboard-header">
        <h1>Bench Sales Dashboard</h1>
        <p>Welcome back, {user?.name || user?.email?.split('@')[0]}</p>
        {metrics.unreadResponses > 0 && (
          <div className="alert-banner">
            🔔 You have {metrics.unreadResponses} unread form responses
          </div>
        )}
      </div>

      <DashboardMetrics metrics={metrics} />

      <div className="dashboard-content">
        <div className="dashboard-main">
          <ActiveCases 
            cases={activeCases} 
            onRefresh={loadDashboardData}
          />
        </div>
        
        <div className="dashboard-sidebar">
          <QuickActions onAction={handleQuickAction} />
          
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {metrics.unreadResponses > 0 && (
                <div className="activity-item highlight">
                  <span className="activity-time">New</span>
                  <span className="activity-text">
                    {metrics.unreadResponses} form response(s) waiting
                  </span>
                </div>
              )}
              <div className="activity-item">
                <span className="activity-time">2 mins ago</span>
                <span className="activity-text">Case #1234 status updated</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">15 mins ago</span>
                <span className="activity-text">New referral from Ram Garu</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">1 hour ago</span>
                <span className="activity-text">Verification completed for Priya S.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchSalesDashboard;
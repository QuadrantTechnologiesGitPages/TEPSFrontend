// src/modules/benchSales/components/Dashboard/DashboardMetrics.jsx
import React from 'react';

const DashboardMetrics = ({ metrics }) => {
  const metricCards = [
    {
      title: 'Active Cases',
      value: metrics.activeCases,
      color: '#667eea',
      icon: '📂',
      trend: 'neutral'
    },
    {
      title: 'Pending Verification',
      value: metrics.pendingVerification,
      color: '#f6ad55',
      icon: '⏳',
      trend: metrics.pendingVerification > 5 ? 'warning' : 'good'
    },
    {
      title: "Today's Follow-ups",
      value: metrics.todayFollowups,
      color: '#48bb78',
      icon: '📞',
      trend: 'neutral'
    },
    {
      title: 'Weekly Submissions',
      value: metrics.weeklySubmissions,
      color: '#9f7aea',
      icon: '📤',
      trend: 'neutral'
    }
  ];

  return (
    <div className="dashboard-metrics">
      {metricCards.map((metric, index) => (
        <div key={index} className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">{metric.icon}</span>
            <span className={`metric-trend ${metric.trend}`}>
              {metric.trend === 'warning' && '⚠️'}
            </span>
          </div>
          <div className="metric-value" style={{ color: metric.color }}>
            {metric.value}
          </div>
          <div className="metric-title">{metric.title}</div>
        </div>
      ))}
    </div>
  );
};

export default DashboardMetrics;
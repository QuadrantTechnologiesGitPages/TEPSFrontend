import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <header className="header">
        <div className="header-brand">
          <h1>
            <span className="brand-primary">Quadrant</span>
            <span className="brand-secondary">360</span>
            <span className="brand-divider">|</span>
            <span className="product-name">Q-CRM</span>
          </h1>
          <p>Intelligent Talent Acquisition & Engagement Platform</p>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;
import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <header className="header">
        <h1>Recruitment Management System</h1>
        <p>Intelligent candidate search and communication platform</p>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;
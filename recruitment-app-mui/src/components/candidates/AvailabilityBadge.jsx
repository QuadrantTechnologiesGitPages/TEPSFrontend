import React from 'react';

const AvailabilityBadge = ({ status }) => {
  const getStatusClass = () => {
    switch(status) {
      case 'Active':
        return 'badge-active';
      case 'Pending Discussion':
        return 'badge-pending';
      case 'In Active':
        return 'badge-inactive';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch(status) {
      case 'Active':
        return '✓';
      case 'Pending Discussion':
        return '⏰';
      case 'In Active':
        return '✗';
      default:
        return '';
    }
  };

  return (
    <span className={`badge ${getStatusClass()}`}>
      {getStatusIcon()} {status}
    </span>
  );
};

export default AvailabilityBadge;
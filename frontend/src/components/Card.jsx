import React from 'react';

export const Card = ({ children, className = '', hoverable = false }) => {
  return (
    <div className={`
      bg-white rounded-xl p-8 shadow-google-sm
      ${hoverable ? 'hover:shadow-google-md transition-shadow duration-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

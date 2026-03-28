import React from 'react';

/**
 * Card component - Container for content sections
 */
const Card = ({ 
  children, 
  className = '', 
  padding = 'p-6',
  shadow = true,
  onClick = null
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        w-full
        bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
        ${shadow ? 'shadow-md hover:shadow-lg' : ''}
        ${padding}
        transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;

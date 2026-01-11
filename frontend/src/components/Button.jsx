import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  onClick,
  disabled,
  type = 'button',
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-google-blue text-white hover:bg-blue-700 shadow-google-sm hover:shadow-google-md',
    secondary: 'bg-google-gray-100 text-google-gray-700 hover:bg-google-gray-200',
    danger: 'bg-google-red text-white hover:bg-red-700 shadow-google-sm hover:shadow-google-md',
    ghost: 'text-google-gray-700 hover:bg-google-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
};

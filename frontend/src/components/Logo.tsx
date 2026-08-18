import React from 'react';

export const Logo: React.FC<{ className?: string; variant?: 'light' | 'dark' }> = ({ 
  className = "h-8 w-auto",
  variant = 'light'
}) => {
  const textColor = variant === 'dark' ? '#ffffff' : '#0f172a';

  return (
    <svg 
      viewBox="0 0 200 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Speed lines on the left of Q */}
      <path 
        d="M 6 18 H 36 L 33 20 H 6 Z" 
        fill="#2563eb" 
        className="opacity-90"
      />
      <path 
        d="M 2 24 H 38 L 35 26 H 2 Z" 
        fill="#3b82f6" 
      />
      <path 
        d="M 8 30 H 32 L 29 32 H 8 Z" 
        fill="#60a5fa" 
        className="opacity-80"
      />

      {/* Italic stylized text for QuickR */}
      <text 
        x="32" 
        y="35" 
        fill={textColor} 
        fontFamily="sans-serif"
        fontWeight="800" 
        fontStyle="italic" 
        fontSize="30"
        letterSpacing="-1px"
      >
        Quick
        <tspan fill="#3b82f6">R</tspan>
      </text>
    </svg>
  );
};

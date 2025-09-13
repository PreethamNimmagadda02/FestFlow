import React from 'react';

// A logo combining the letter 'F' with a series of flowing, parallel lines,
// representing multiple tasks being orchestrated in a smooth flow.
export const FestFlowLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = React.memo((props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 6.5H3" />
    <path d="M15 11.5H3" />
    <path d="M9 16.5H3" />
    <path d="M21 6.5c-4 0-4 5-8 5" />
    <path d="M17 11.5c-2 0-2 5-4 5" />
  </svg>
));
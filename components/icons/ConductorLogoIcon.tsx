import React from 'react';

// A stylized icon of a conductor's baton, symbolizing orchestration and control.
export const ConductorLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = React.memo((props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17.5 2.5L2.5 17.5" />
    <circle cx="4" cy="20" r="1.5" />
  </svg>
));
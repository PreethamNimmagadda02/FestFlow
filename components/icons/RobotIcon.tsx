
import React from 'react';

export const RobotIcon: React.FC<React.SVGProps<SVGSVGElement>> = React.memo((props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
    <circle cx="12" cy="5" r="3"></circle>
    <path d="M20 11v-2a2 2 0 0 0-2-2h-2"></path>
    <path d="M4 9V7a2 2 0 0 1 2-2h2"></path>
    <path d="M12 11v10"></path>
  </svg>
));
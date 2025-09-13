
import React from 'react';

// An abstract logo representing three interconnected nodes, symbolizing synergy and orchestration.
export const SynapseLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = React.memo((props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="3" />
    <circle cx="19" cy="12" r="3" />
    <circle cx="5" cy="12" r="3" />
    <path d="M12 8v7" />
    <path d="m16.5 10.5-9 3" />
    <path d="m7.5 10.5 9 3" />
  </svg>
));
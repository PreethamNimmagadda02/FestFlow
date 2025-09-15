import React from 'react';

// A complex, high-fidelity abstract logo representing the orchestration of multiple elements in a flow.
// It features a central glowing gem on a rounded square base, and four interwoven, colored ribbons
// with metallic pins on silver connectors, symbolizing different agents or tasks coming together.
export const FestFlowLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = React.memo((props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    {...props}
  >
    <defs>
      {/* Gem gradients */}
      <radialGradient id="ff-gem-glow-2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#A6E1FA" stopOpacity="1" />
        <stop offset="70%" stopColor="#0B4F6C" stopOpacity="1" />
        <stop offset="100%" stopColor="#023047" stopOpacity="1" />
      </radialGradient>
      
      {/* Ribbon Gradients for 3D effect */}
      <linearGradient id="ff-orange-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
      <linearGradient id="ff-teal-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2DD4BF" />
        <stop offset="100%" stopColor="#14B8A6" />
      </linearGradient>
      <linearGradient id="ff-pink-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
      <linearGradient id="ff-green-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>

      {/* Pin gradient for bright metallic look */}
      <radialGradient id="ff-pin-gradient-2" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#F3F4F6" />
        <stop offset="100%" stopColor="#D1D5DB" />
      </radialGradient>
      
      {/* Softer shadow filter */}
      <filter id="ff-shadow-soft" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.15"/>
      </filter>
    </defs>
    
    <g filter="url(#ff-shadow-soft)">
        {/* Weaving logic: Draw bottom segments first, then top segments. */}
        {/* Pattern: Each ribbon goes OVER the one to its clockwise side, and UNDER the one to its anti-clockwise side. */}
        <g strokeWidth="8" strokeLinecap="round" fill="none">
            {/* Layer 1: The "UNDER" segments */}
            <path d="M 60,18 C 75,18 82,25 82,40" stroke="url(#ff-orange-gradient-2)" /> {/* Orange under Teal */}
            <path d="M 82,60 C 82,75 75,82 60,82" stroke="url(#ff-teal-gradient-2)" />   {/* Teal under Pink */}
            <path d="M 40,82 C 25,82 18,75 18,60" stroke="url(#ff-pink-gradient-2)" />   {/* Pink under Green */}
            <path d="M 18,40 C 18,25 25,18 40,18" stroke="url(#ff-green-gradient-2)" />  {/* Green under Orange */}

            {/* Layer 2: The "OVER" segments */}
            <path d="M 40,18 C 25,18 18,25 18,40" stroke="url(#ff-orange-gradient-2)" /> {/* Orange over Green */}
            <path d="M 60,82 C 75,82 82,75 82,60" stroke="url(#ff-teal-gradient-2)" />   {/* Teal over Pink */}
            <path d="M 18,60 C 18,75 25,82 40,82" stroke="url(#ff-pink-gradient-2)" />   {/* Pink over Green */}
            <path d="M 82,40 C 82,25 75,18 60,18" stroke="url(#ff-teal-gradient-2)" />   {/* Re-draw Teal to be over Orange */}

            {/* Ribbon highlights for 3D effect */}
            <g strokeWidth="1.5" stroke="white" strokeOpacity="0.5">
                <path d="M 60,18 C 75,18 82,25 82,40" /> <path d="M 40,18 C 25,18 18,25 18,40" />
                <path d="M 82,60 C 82,75 75,82 60,82" /> <path d="M 60,82 C 75,82 82,75 82,60" />
                <path d="M 40,82 C 25,82 18,75 18,60" /> <path d="M 18,60 C 18,75 25,82 40,82" />
                <path d="M 18,40 C 18,25 25,18 40,18" /> <path d="M 82,40 C 82,25 75,18 60,18" />
            </g>
        </g>
      
      {/* Silver Connectors underneath the pins */}
      <g fill="#BCC2C7" stroke="#9CA3AF" strokeWidth="0.5">
        <circle cx="28" cy="28" r="4.5" />
        <circle cx="72" cy="28" r="4.5" />
        <circle cx="72" cy="72" r="4.5" />
        <circle cx="28" cy="72" r="4.5" />
        <circle cx="50" cy="12" r="4.5" />
        <circle cx="88" cy="50" r="4.5" />
        <circle cx="50" cy="88" r="4.5" />
        <circle cx="12" cy="50" r="4.5" />
      </g>
      
      {/* Pins */}
      <g fill="url(#ff-pin-gradient-2)" stroke="#E5E7EB" strokeWidth="0.5">
          <circle cx="28" cy="28" r="3.5" />
          <circle cx="72" cy="28" r="3.5" />
          <circle cx="72" cy="72" r="3.5" />
          <circle cx="28" cy="72" r="3.5" />
          <circle cx="50" cy="12" r="3.5" />
          <circle cx="88" cy="50" r="3.5" />
          <circle cx="50" cy="88" r="3.5" />
          <circle cx="12" cy="50" r="3.5" />
      </g>
    </g>

    {/* Central Gem Element */}
    <g transform="translate(50,50)">
      {/* Base: Rounded Square */}
      <rect x="-21" y="-21" width="42" height="42" rx="8" fill="#023047" stroke="#1E293B" strokeWidth="1.5"/>
      {/* Gem: Rounded Octagon */}
      <path 
        d="M -2, -18 Q 0, -20, 2, -18 L 18, -2 Q 20, 0, 18, 2 L 2, 18 Q 0, 20, -2, 18 L -18, 2 Q -20, 0, -18, -2 Z"
        fill="url(#ff-gem-glow-2)"
        stroke="#6366F1"
        strokeWidth="0.5"
        strokeOpacity="0.5"
      />
      {/* Inner flare */}
      <path 
        d="M 0,-13.5 9.5,-9.5 13.5,0 9.5,9.5 0,13.5 -9.5,9.5 -13.5,0 -9.5,-9.5 Z"
        fill="none"
        stroke="#A6E1FA"
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
       <circle cx="0" cy="0" r="4" fill="#A6E1FA" opacity="0.8"/>
       <circle cx="0" cy="0" r="2" fill="#FFFFFF" opacity="0.9"/>
    </g>
  </svg>
));

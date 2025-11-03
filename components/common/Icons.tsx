import React from 'react';

export const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

export const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export const BrazilFlagIcon: React.FC = () => (
    <svg width="24" height="18" viewBox="0 0 22 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="22" height="15" rx="2" fill="#009B3A"/>
        <path d="M11 2L20 7.5L11 13L2 7.5L11 2Z" fill="#FFCC29"/>
        <circle cx="11" cy="7.5" r="3" fill="#002776"/>
    </svg>
);

export const USFlagIcon: React.FC = () => (
    <svg width="24" height="18" viewBox="0 0 22 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="22" height="15" rx="2" fill="#FFFFFF"/>
        <path d="M0 2C0 0.895431 0.895431 0 2 0H20C21.1046 0 22 0.895431 22 2V13C22 14.1046 21.1046 15 20 15H2C0.895431 15 0 14.1046 0 13V2Z" fill="#B31942"/>
        <path d="M0 2.5H22V4.5H0V2.5Z" fill="#FFFFFF"/>
        <path d="M0 7.5H22V9.5H0V7.5Z" fill="#FFFFFF"/>
        <path d="M0 12.5H22V14.5H0V12.5Z" fill="#FFFFFF"/>
        <path d="M0 2C0 0.895431 0.895431 0 2 0H10V7.5H0V2Z" fill="#0A3161"/>
    </svg>
);

export const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

export const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
);
export const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

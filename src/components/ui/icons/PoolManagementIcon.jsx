import React from 'react';

const PoolManagementIcon = ({ className = "w-6 h-6", ...props }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Left Rail */}
            <path d="M7 16V6a2 2 0 0 1 2-2" />

            {/* Right Rail */}
            <path d="M17 16V6a2 2 0 0 0-2-2" />

            {/* Rungs */}
            <line x1="7" y1="10" x2="17" y2="10" />
            <line x1="7" y1="6" x2="17" y2="6" />
            <line x1="7" y1="14" x2="17" y2="14" />

            {/* Waves */}
            <path d="M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.5 2.5 1" />
            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.5 2.5 1" />
        </svg>
    );
};

export default PoolManagementIcon;

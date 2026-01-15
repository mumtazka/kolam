import React from 'react';

const SpecialTicketIcon = ({ className = "w-6 h-6", ...props }) => {
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
            {/* Ticket Outline */}
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />

            {/* Percentage Sign */}
            <path d="M9 15L15 9" /> {/* Slash */}
            <circle cx="9.5" cy="9.5" r="1.5" fill="currentColor" /> {/* Top Left Dot */}
            <circle cx="14.5" cy="14.5" r="1.5" fill="currentColor" /> {/* Bottom Right Dot */}
        </svg>
    );
};

export default SpecialTicketIcon;

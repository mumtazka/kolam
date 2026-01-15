import React from 'react';

const PoolLogo = ({ className = "w-12 h-12" }) => {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <rect width="100" height="100" rx="20" fill="#0f172a" />

            {/* Head */}
            <circle cx="68" cy="35" r="8" stroke="#14b8a6" strokeWidth="6" />

            {/* Body / Arm */}
            <path
                d="M25 45 C 25 45, 35 35, 50 40 C 65 45, 60 55, 55 60 L 45 55"
                stroke="#14b8a6"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Arm extended */}
            <path
                d="M50 40 L 30 35"
                stroke="#14b8a6"
                strokeWidth="6"
                strokeLinecap="round"
            />

            {/* Waves */}
            <path
                d="M20 65 Q 35 55 50 65 T 80 65"
                stroke="#14b8a6"
                strokeWidth="6"
                strokeLinecap="round"
            />
            <path
                d="M20 78 Q 35 68 50 78 T 80 78"
                stroke="#14b8a6"
                strokeWidth="6"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default PoolLogo;

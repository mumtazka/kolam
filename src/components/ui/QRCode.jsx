import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * QR Code component for ticket display
 * Replaces the old Barcode component
 */
const QRCode = ({ value, size = 100, level = 'M' }) => {
    if (!value) return null;

    return (
        <QRCodeSVG
            value={value}
            size={size}
            level={level}  // Error correction: L, M, Q, H
            marginSize={0}
        />
    );
};

export default QRCode;

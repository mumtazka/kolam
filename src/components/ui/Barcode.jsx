import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const Barcode = ({ value, width = 2, height = 50, format = 'CODE128', displayValue = false }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && value) {
            try {
                JsBarcode(canvasRef.current, value, {
                    format: format,
                    width: width,
                    height: height,
                    displayValue: displayValue,
                    margin: 0,
                    background: "transparent"
                });
            } catch (error) {
                console.error("Barcode generation error:", error);
            }
        }
    }, [value, width, height, format, displayValue]);

    return <canvas ref={canvasRef} />;
};

export default Barcode;

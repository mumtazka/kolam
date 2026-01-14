import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './dialog';
import { Button } from './button';
import { AlertTriangle, Trash2, Info, AlertCircle, XCircle } from 'lucide-react';

/**
 * ConfirmDialog - A professional confirmation modal component
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onOpenChange - Callback when open state changes
 * @param {string} title - Dialog title
 * @param {string} description - Dialog description/message
 * @param {function} onConfirm - Callback when user confirms
 * @param {function} onCancel - Callback when user cancels
 * @param {string} confirmText - Text for confirm button (default: "Hapus")
 * @param {string} cancelText - Text for cancel button (default: "Batal")
 * @param {string} variant - Dialog variant: "danger", "warning", or "info" (default: "danger")
 * @param {boolean} loading - Whether confirm action is loading
 */
const ConfirmDialog = ({
    open,
    onOpenChange,
    title = "Konfirmasi",
    description = "Apakah Anda yakin ingin melanjutkan?",
    onConfirm,
    onCancel,
    confirmText = "Ya, Hapus",
    cancelText = "Batal",
    variant = "danger",
    loading = false,
}) => {
    const handleCancel = () => {
        onCancel?.();
        onOpenChange?.(false);
    };

    const handleConfirm = () => {
        onConfirm?.();
    };

    // Variant styles with enhanced design
    const variantStyles = {
        danger: {
            icon: Trash2,
            iconBg: "bg-gradient-to-br from-red-100 to-red-50",
            iconColor: "text-red-600",
            iconRing: "ring-4 ring-red-50",
            buttonClass: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/25 text-white",
            titleColor: "text-red-900",
        },
        warning: {
            icon: AlertTriangle,
            iconBg: "bg-gradient-to-br from-amber-100 to-amber-50",
            iconColor: "text-amber-600",
            iconRing: "ring-4 ring-amber-50",
            buttonClass: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25 text-white",
            titleColor: "text-amber-900",
        },
        info: {
            icon: Info,
            iconBg: "bg-gradient-to-br from-blue-100 to-blue-50",
            iconColor: "text-blue-600",
            iconRing: "ring-4 ring-blue-50",
            buttonClass: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 text-white",
            titleColor: "text-blue-900",
        },
    };

    const currentVariant = variantStyles[variant] || variantStyles.danger;
    const IconComponent = currentVariant.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-0 shadow-2xl">
                {/* Header decoration */}
                <div className={`h-2 w-full ${variant === 'danger' ? 'bg-gradient-to-r from-red-500 to-red-600' : variant === 'warning' ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`} />

                <div className="p-6">
                    <DialogHeader className="flex flex-col items-center text-center">
                        {/* Icon with enhanced styling */}
                        <div className={`w-20 h-20 rounded-full ${currentVariant.iconBg} ${currentVariant.iconRing} flex items-center justify-center mb-5 transition-transform hover:scale-105`}>
                            <IconComponent className={`w-10 h-10 ${currentVariant.iconColor}`} strokeWidth={1.5} />
                        </div>

                        <DialogTitle className={`text-xl font-bold ${currentVariant.titleColor} mb-2`}>
                            {title}
                        </DialogTitle>

                        <DialogDescription className="text-slate-600 text-[15px] leading-relaxed max-w-[360px]">
                            {description}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Warning notice for danger variant */}
                    {variant === 'danger' && (
                        <div className="mt-5 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 leading-relaxed">
                                Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex-1 h-12 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium transition-all duration-200"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            className={`flex-1 h-12 font-semibold transition-all duration-200 ${currentVariant.buttonClass}`}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Memproses...</span>
                                </div>
                            ) : (
                                confirmText
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export { ConfirmDialog };

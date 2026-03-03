/**
 * Загрузка файлов: drag-and-drop + file picker + paste.
 * Возвращает isDragOver, uploading, handlers.
 */

import { useState, useRef, useCallback } from 'react';

export function useFileUpload(onSendFile: (file: File) => void) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (file: File) => {
        if (uploading) return;
        if (file.size > 50 * 1024 * 1024) {
            alert('Максимальный размер файла — 50 МБ');
            return;
        }
        setUploading(true);
        try {
            await onSendFile(file);
        } catch (err) {
            console.error('Ошибка отправки файла:', err);
        } finally {
            setUploading(false);
        }
    }, [uploading, onSendFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleFileSelect(file);
                return;
            }
        }
    }, [handleFileSelect]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [handleFileSelect]);

    const openFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return {
        isDragOver,
        uploading,
        fileInputRef,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste,
        handleFileInputChange,
        openFilePicker,
    };
}

import { useEffect } from 'react';

/**
 * Отслеживает visualViewport для корректной работы с виртуальной клавиатурой iOS.
 * Устанавливает CSS-переменную --vh с реальной высотой видимой области.
 */
export function useViewportResize() {
    useEffect(() => {
        if (!window.visualViewport) return;

        const handleResize = () => {
            const vh = window.visualViewport!.height;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        handleResize();

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, []);
}

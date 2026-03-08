import { useEffect } from 'react';

/**
 * Синхронизирует CSS-переменные с реальной видимой областью.
 *
 * Проблема iOS Safari: при открытии клавиатуры браузер делает два действия:
 *   - visualViewport.height уменьшается (высота видимой области)
 *   - visualViewport.offsetTop увеличивается (на сколько px сдвинулся viewport)
 *
 * Если учитывать только height — layout рендерится в верхней части страницы,
 * а пользователь смотрит в середину (туда куда iOS сдвинул viewport).
 * Результат: пустое место вместо поля ввода над клавиатурой.
 *
 * Решение: position: fixed + top: var(--vp-offset-top) на .chat-layout.
 * Layout всегда "следует" за видимой областью.
 *
 * На Android Chrome 108+ с interactive-widget=resizes-content этот хук
 * вообще не нужен (offsetTop всегда 0), но оставляем как надёжный fallback.
 */
export function useViewportResize() {
    useEffect(() => {
        const vp = window.visualViewport;
        if (!vp) return;

        const update = () => {
            // Высота видимой области (уменьшается при появлении клавиатуры)
            document.documentElement.style.setProperty('--vh', `${vp.height}px`);
            // Смещение видимой области от верха страницы (растёт на iOS при keyboard)
            document.documentElement.style.setProperty('--vp-offset-top', `${vp.offsetTop}px`);
        };

        vp.addEventListener('resize', update);
        vp.addEventListener('scroll', update);
        update();

        return () => {
            vp.removeEventListener('resize', update);
            vp.removeEventListener('scroll', update);
        };
    }, []);
}

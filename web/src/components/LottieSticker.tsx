import React, { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';

interface LottieStickerProps {
    /** HTTP URL для загрузки JSON-анимации */
    url: string;
    width?: number;
    height?: number;
    loop?: boolean;
    className?: string;
}

export const LottieSticker: React.FC<LottieStickerProps> = ({
    url, width = 200, height = 200, loop = true, className,
}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [animationData, setAnimationData] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const resp = await fetch(url);
                const data = await resp.json();
                if (!cancelled) setAnimationData(data);
            } catch (err) {
                console.error('Ошибка загрузки Lottie:', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [url]);

    // Intersection Observer — пауза анимации вне viewport
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.3 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (!animationData) {
        return <div className="lottie-sticker__placeholder" style={{ width, height }} />;
    }

    return (
        <div ref={containerRef} className={className}>
            <Lottie
                animationData={animationData}
                loop={loop}
                autoplay={isVisible}
                style={{ width, height }}
            />
        </div>
    );
};

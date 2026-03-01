import React, { useState, useRef, useEffect } from 'react';
import { VolumeX } from 'lucide-react';

interface VideoNoteProps {
    fileUrl: string | null;
    thumbnailUrl?: string | null;
    duration: number;           // миллисекунды
}

export const VideoNote: React.FC<VideoNoteProps> = ({ fileUrl, thumbnailUrl, duration }) => {
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const durationSec = duration / 1000;

    // Автоплей при скролле в viewport
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    videoRef.current?.play().catch(() => {});
                    setPlaying(true);
                } else {
                    videoRef.current?.pause();
                    setPlaying(false);
                }
            },
            { threshold: 0.6 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTime = () => setProgress(video.currentTime / (durationSec || 1));
        const onEnded = () => {
            setProgress(0);
            video.currentTime = 0;
            video.play();
        };

        video.addEventListener('timeupdate', onTime);
        video.addEventListener('ended', onEnded);
        return () => {
            video.removeEventListener('timeupdate', onTime);
            video.removeEventListener('ended', onEnded);
        };
    }, [durationSec]);

    const handleClick = () => {
        setMuted(!muted);
        if (videoRef.current) videoRef.current.muted = !muted;
    };

    const size = 240;
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    if (!fileUrl) return <span>Видео недоступно</span>;

    return (
        <div
            ref={containerRef}
            className="video-note"
            style={{ width: size, height: size }}
            onClick={handleClick}
        >
            <svg className="video-note__ring" viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="var(--uplink-accent)" strokeWidth="3"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            </svg>

            <video
                ref={videoRef}
                src={fileUrl}
                poster={thumbnailUrl || undefined}
                className="video-note__video"
                muted={muted}
                playsInline
                preload="metadata"
            />

            {muted && playing && (
                <div className="video-note__mute-indicator">
                    <VolumeX size={14} />
                </div>
            )}

            <div className="video-note__duration">
                {Math.floor(durationSec / 60)}:{Math.floor(durationSec % 60).toString().padStart(2, '0')}
            </div>
        </div>
    );
};

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessageProps {
    fileUrl: string | null;
    duration: number;       // миллисекунды
    waveform?: number[];    // 0-1024 (MSC1767)
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({ fileUrl, duration, waveform }) => {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);

    const durationSec = duration / 1000;

    const normalizedWaveform = (waveform || []).map(v => v / 1024);
    const bars = normalizedWaveform.length > 0
        ? normalizedWaveform
        : Array.from({ length: 40 }, () => 0.2 + Math.random() * 0.6);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            setProgress(audio.currentTime / (durationSec || 1));
        };
        const onEnded = () => {
            setPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
        };
    }, [durationSec]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
        } else {
            audio.play();
        }
        setPlaying(!playing);
    };

    const cycleSpeed = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
        setPlaybackRate(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
    };

    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        if (audioRef.current) {
            audioRef.current.currentTime = ratio * durationSec;
            setProgress(ratio);
        }
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!fileUrl) return <span className="voice-message__error">Аудио недоступно</span>;

    return (
        <div className="voice-message">
            <audio ref={audioRef} src={fileUrl} preload="metadata" />

            <button className="voice-message__play" onClick={togglePlay}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>

            <div className="voice-message__body">
                <div className="voice-message__waveform" onClick={handleWaveformClick}>
                    {bars.map((v, i) => (
                        <div
                            key={i}
                            className={`voice-message__bar ${i / bars.length <= progress ? 'voice-message__bar--played' : ''}`}
                            style={{ height: `${Math.max(v * 100, 10)}%` }}
                        />
                    ))}
                </div>
                <div className="voice-message__footer">
                    <span className="voice-message__time">
                        {playing ? formatTime(currentTime) : formatTime(durationSec)}
                    </span>
                    <button className="voice-message__speed" onClick={cycleSpeed}>
                        {playbackRate}x
                    </button>
                </div>
            </div>
        </div>
    );
};

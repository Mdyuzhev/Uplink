import React, { useState, useEffect, useRef } from 'react';
import { Send, SwitchCamera } from 'lucide-react';
import { videoNoteRecorder, VideoNoteRecording } from '../services/VideoNoteRecorder';

interface VideoNoteRecordOverlayProps {
    onSend: (recording: VideoNoteRecording) => void;
    onCancel: () => void;
}

export const VideoNoteRecordOverlay: React.FC<VideoNoteRecordOverlayProps> = ({ onSend, onCancel }) => {
    const [phase, setPhase] = useState<'preview' | 'recording' | 'review'>('preview');
    const [elapsed, setElapsed] = useState(0);
    const [recording, setRecording] = useState<VideoNoteRecording | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const videoRef = useRef<HTMLVideoElement>(null);
    const reviewVideoRef = useRef<HTMLVideoElement>(null);
    const reviewUrlRef = useRef<string | null>(null);
    const MAX_DURATION = 30;

    useEffect(() => {
        let cancelled = false;
        videoNoteRecorder.getPreviewStream('user').then(stream => {
            if (cancelled) return;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        }).catch(() => onCancel());

        return () => {
            cancelled = true;
            videoNoteRecorder.cancel();
            if (reviewUrlRef.current) URL.revokeObjectURL(reviewUrlRef.current);
        };
    }, []);

    useEffect(() => {
        videoNoteRecorder.onTimeUpdate = (sec) => setElapsed(sec);
        videoNoteRecorder.onAutoStop = async () => {
            const rec = await videoNoteRecorder.stop();
            if (rec) {
                setRecording(rec);
                setPhase('review');
            }
        };
    }, []);

    const handleRecord = () => {
        videoNoteRecorder.start();
        setPhase('recording');
    };

    const handleStop = async () => {
        const rec = await videoNoteRecorder.stop();
        if (rec && rec.duration > 0.5) {
            setRecording(rec);
            setPhase('review');
        } else {
            onCancel();
        }
    };

    const handleSend = () => {
        if (recording) {
            videoNoteRecorder.releaseStream();
            onSend(recording);
        }
    };

    const handleRetake = () => {
        if (reviewUrlRef.current) {
            URL.revokeObjectURL(reviewUrlRef.current);
            reviewUrlRef.current = null;
        }
        setRecording(null);
        setElapsed(0);
        setPhase('preview');
    };

    const handleCancel = () => {
        videoNoteRecorder.cancel();
        onCancel();
    };

    const handleFlipCamera = async () => {
        if (phase === 'recording') return;
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        try {
            const stream = await videoNoteRecorder.switchCamera(newMode);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setFacingMode(newMode);
        } catch {
            // камера недоступна
        }
    };

    useEffect(() => {
        if (phase === 'review' && recording && reviewVideoRef.current) {
            const url = URL.createObjectURL(recording.blob);
            reviewUrlRef.current = url;
            reviewVideoRef.current.src = url;
        }
    }, [phase, recording]);

    const progressRatio = elapsed / MAX_DURATION;
    const circumference = 2 * Math.PI * 120;
    const dashOffset = circumference * (1 - progressRatio);

    return (
        <div className="video-note-overlay">
            <div className="video-note-overlay__backdrop" onClick={handleCancel} />

            <div className="video-note-overlay__container">
                <div className="video-note-overlay__circle">
                    {phase === 'recording' && (
                        <svg className="video-note-overlay__progress-ring" viewBox="0 0 248 248">
                            <circle
                                cx="124" cy="124" r="120"
                                fill="none"
                                stroke="var(--uplink-accent)"
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                transform="rotate(-90 124 124)"
                            />
                        </svg>
                    )}

                    {phase === 'review' && recording ? (
                        <video
                            ref={reviewVideoRef}
                            className="video-note-overlay__video"
                            loop muted autoPlay playsInline
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            className="video-note-overlay__video"
                            muted autoPlay playsInline
                        />
                    )}
                </div>

                {phase === 'recording' && (
                    <div className="video-note-overlay__timer">
                        <span className="video-note-overlay__rec-dot" />
                        {Math.floor(elapsed / 60)}:{Math.floor(elapsed % 60).toString().padStart(2, '0')}
                    </div>
                )}

                <div className={`video-note-overlay__controls video-note-overlay__controls--${phase}`}>
                    {phase === 'preview' && (
                        <>
                            <button className="video-note-overlay__btn video-note-overlay__btn--cancel" onClick={handleCancel}>
                                Отмена
                            </button>
                            <button className="video-note-overlay__btn video-note-overlay__btn--record" onClick={handleRecord} aria-label="Начать запись" />
                            <button className="video-note-overlay__btn video-note-overlay__btn--flip" onClick={handleFlipCamera} aria-label="Сменить камеру">
                                <SwitchCamera size={20} />
                            </button>
                        </>
                    )}
                    {phase === 'recording' && (
                        <button className="video-note-overlay__btn video-note-overlay__btn--stop" onClick={handleStop} aria-label="Остановить запись" />
                    )}
                    {phase === 'review' && (
                        <>
                            <button className="video-note-overlay__btn video-note-overlay__btn--retake" onClick={handleRetake}>
                                Переснять
                            </button>
                            <button className="video-note-overlay__btn video-note-overlay__btn--send" onClick={handleSend}>
                                <Send size={16} /> Отправить
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

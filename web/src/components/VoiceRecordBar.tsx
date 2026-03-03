import React, { useState, useEffect } from 'react';
import { X, Square, Send } from 'lucide-react';
import { voiceRecorder, VoiceRecording } from '../services/VoiceRecorder';
import styles from './VoiceRecordBar.module.css';

interface VoiceRecordBarProps {
    onSend: (recording: VoiceRecording) => void;
    onCancel: () => void;
}

export const VoiceRecordBar: React.FC<VoiceRecordBarProps> = ({ onSend, onCancel }) => {
    const [elapsed, setElapsed] = useState(0);
    const [amplitude, setAmplitude] = useState(0);
    const [stopped, setStopped] = useState(false);
    const [recording, setRecording] = useState<VoiceRecording | null>(null);
    const MAX_DURATION = 30;

    useEffect(() => {
        voiceRecorder.onTimeUpdate = (sec) => setElapsed(sec);
        voiceRecorder.onAmplitude = (amp) => setAmplitude(amp);
        voiceRecorder.onAutoStop = async () => {
            const rec = await voiceRecorder.stop();
            if (rec) {
                setRecording(rec);
                setStopped(true);
            }
        };

        voiceRecorder.start().catch(() => onCancel());

        return () => {
            voiceRecorder.onTimeUpdate = undefined;
            voiceRecorder.onAmplitude = undefined;
            voiceRecorder.onAutoStop = undefined;
        };
    }, []);

    const handleStop = async () => {
        const rec = await voiceRecorder.stop();
        if (rec && rec.duration > 0.5) {
            setRecording(rec);
            setStopped(true);
        } else {
            onCancel();
        }
    };

    const handleCancel = () => {
        voiceRecorder.cancel();
        onCancel();
    };

    const handleSend = () => {
        if (recording) onSend(recording);
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.bar}>
            <button className={styles.cancel} onClick={handleCancel} title="Отмена">
                <X size={18} />
            </button>

            <div className={styles.waveform}>
                {!stopped ? (
                    <>
                        <div className={styles.pulse}
                             style={{ transform: `scale(${1 + amplitude * 0.5})` }} />
                        <span className={styles.recordingDot} />
                    </>
                ) : (
                    <WaveformPreview waveform={recording?.waveform || []} />
                )}
            </div>

            <span className={styles.time}>
                {formatTime(stopped ? (recording?.duration || 0) : elapsed)}
            </span>

            {!stopped && (
                <div className={styles.progress}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${(elapsed / MAX_DURATION) * 100}%` }}
                    />
                </div>
            )}

            {!stopped ? (
                <button className={styles.stop} onClick={handleStop} title="Остановить">
                    <Square size={14} />
                </button>
            ) : (
                <button className={styles.send} onClick={handleSend} title="Отправить">
                    <Send size={14} />
                </button>
            )}
        </div>
    );
};

const WaveformPreview: React.FC<{ waveform: number[] }> = ({ waveform }) => (
    <div className={styles.waveformPreview}>
        {waveform.map((v, i) => (
            <div
                key={i}
                className={styles.waveformBar}
                style={{ height: `${Math.max(v * 100, 8)}%` }}
            />
        ))}
    </div>
);

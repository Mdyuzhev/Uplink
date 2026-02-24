import React, { useState, useEffect, useRef } from 'react';
import { livekitService, CallParticipant } from '../livekit/LiveKitService';

interface VideoGridProps {
    participants: CallParticipant[];
}

interface VideoTileProps {
    identity: string;
    displayName: string;
    track: MediaStreamTrack | null;
}

const VideoTile: React.FC<VideoTileProps> = ({ identity, displayName, track }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && track) {
            videoRef.current.srcObject = new MediaStream([track]);
        }
        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [track]);

    const name = displayName || identity.split(':')[0].replace('@', '');

    return (
        <div className="video-tile">
            {track ? (
                <video
                    ref={videoRef}
                    className="video-tile__video"
                    autoPlay
                    playsInline
                    muted={true}
                />
            ) : (
                <div className="video-tile__placeholder">
                    <span className="video-tile__placeholder-icon">&#x1F60E;</span>
                </div>
            )}
            <span className="video-tile__name">{name}</span>
        </div>
    );
};

export const VideoGrid: React.FC<VideoGridProps> = ({ participants }) => {
    const [tracks, setTracks] = useState<Map<string, MediaStreamTrack>>(new Map());

    useEffect(() => {
        const unsub = livekitService.onVideoTrack((identity, track) => {
            setTracks(prev => {
                const next = new Map(prev);
                if (track) {
                    next.set(identity, track);
                } else {
                    next.delete(identity);
                }
                return next;
            });
        });
        return unsub;
    }, []);

    if (participants.length === 0) return null;

    return (
        <div className="video-grid">
            {participants.map(p => (
                <VideoTile
                    key={p.identity}
                    identity={p.identity}
                    displayName={p.displayName}
                    track={tracks.get(p.identity) || null}
                />
            ))}
        </div>
    );
};

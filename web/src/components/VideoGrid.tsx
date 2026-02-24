import React, { useState, useEffect, useRef } from 'react';
import { livekitService } from '../livekit/LiveKitService';

interface VideoTileProps {
    identity: string;
    track: MediaStreamTrack;
}

const VideoTile: React.FC<VideoTileProps> = ({ identity, track }) => {
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

    const displayName = identity.split(':')[0].replace('@', '');

    return (
        <div className="video-tile">
            <video
                ref={videoRef}
                className="video-tile__video"
                autoPlay
                playsInline
                muted={true}
            />
            <span className="video-tile__name">{displayName}</span>
        </div>
    );
};

export const VideoGrid: React.FC = () => {
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

    if (tracks.size === 0) return null;

    return (
        <div className="video-grid">
            {Array.from(tracks.entries()).map(([identity, track]) => (
                <VideoTile key={identity} identity={identity} track={track} />
            ))}
        </div>
    );
};

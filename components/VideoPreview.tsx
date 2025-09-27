import React, { useRef, useEffect } from 'react';

interface VideoPreviewProps {
    stream: MediaStream | null;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ stream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) {
        return null;
    }

    return (
        <div className="absolute bottom-28 right-4 w-48 h-36 bg-black rounded-lg shadow-2xl border-2 border-gray-600 z-20 overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
    );
};

export default VideoPreview;
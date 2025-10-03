import React, { useState, useRef, useEffect } from 'react';

type ScreenRecordingState = 'idle' | 'requesting' | 'active' | 'error';

interface ScreenRecordingPreviewProps {
    isActive: boolean;
    onStreamChange?: (stream: MediaStream | null) => void;
}

export default function ScreenRecordingPreview({ isActive, onStreamChange }: ScreenRecordingPreviewProps) {
    const [screenRecordingState, setScreenRecordingState] = useState<ScreenRecordingState>('idle');
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Clean up stream when component becomes inactive
    useEffect(() => {
        if (!isActive && screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            setScreenStream(null);
            setScreenRecordingState('idle');
        }
    }, [isActive, screenStream]);

    // Update video element when stream changes
    useEffect(() => {
        if (videoRef.current && screenStream) {
            videoRef.current.srcObject = screenStream;
        }
        if (onStreamChange) {
            onStreamChange(screenStream);
        }
    }, [screenStream, onStreamChange]);

    const startScreenRecording = async () => {
        setScreenRecordingState('requesting');
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });
            
            setScreenStream(stream);
            setScreenRecordingState('active');

            // Handle stream ending (user stops sharing)
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                setScreenStream(null);
                setScreenRecordingState('idle');
            });
        } catch (error) {
            console.error('Error accessing screen:', error);
            setScreenRecordingState('error');
            setTimeout(() => setScreenRecordingState('idle'), 3000);
        }
    };

    const stopScreenRecording = () => {
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            setScreenStream(null);
            setScreenRecordingState('idle');
        }
    };

    return (
        <div className="preview-container">
            {screenRecordingState === 'idle' && (
                <>
                    <span className="material-icons-round preview-icon">screen_share</span>
                    <h4>Screen Recording Preview</h4>
                    <p>Click the button below to enable screen recording</p>
                    <button className="start-recording-button" onClick={startScreenRecording}>
                        <span className="material-icons-round">play_circle</span>
                        Start Screen Recording
                    </button>
                </>
            )}
            {screenRecordingState === 'requesting' && (
                <>
                    <span className="material-icons-round preview-icon spinning">screen_share</span>
                    <h4>Requesting Permission</h4>
                    <p>Please allow screen recording in your browser</p>
                </>
            )}
            {screenRecordingState === 'active' && (
                <div className="video-preview">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="screen-video"
                    />
                    <div className="video-controls">
                        <button className="stop-recording-button" onClick={stopScreenRecording}>
                            <span className="material-icons-round">stop_circle</span>
                            Stop Recording
                        </button>
                    </div>
                </div>
            )}
            {screenRecordingState === 'error' && (
                <>
                    <span className="material-icons-round preview-icon error">error</span>
                    <h4>Permission Denied</h4>
                    <p>Screen recording access was denied. Please try again.</p>
                </>
            )}
        </div>
    );
}
import { useState, useRef, useEffect } from 'react';

type WebcamState = 'idle' | 'requesting' | 'active' | 'error';

interface WebcamPreviewProps {
    isActive: boolean;
    onStreamChange?: (stream: MediaStream | null) => void;
}

export default function WebcamPreview({ isActive, onStreamChange }: WebcamPreviewProps) {
    const [webcamState, setWebcamState] = useState<WebcamState>('idle');
    const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
    const webcamVideoRef = useRef<HTMLVideoElement>(null);

    // Clean up stream when component becomes inactive
    useEffect(() => {
        if (!isActive && webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            setWebcamStream(null);
            setWebcamState('idle');
        }
    }, [isActive, webcamStream]);

    // Update video element when stream changes
    useEffect(() => {
        if (webcamVideoRef.current && webcamStream) {
            webcamVideoRef.current.srcObject = webcamStream;
        }
        if (onStreamChange) {
            onStreamChange(webcamStream);
        }
    }, [webcamStream, onStreamChange]);

    const startWebcam = async () => {
        setWebcamState('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            
            setWebcamStream(stream);
            setWebcamState('active');

            // Handle stream ending (user revokes permission or device disconnected)
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                setWebcamStream(null);
                setWebcamState('idle');
            });
        } catch (error) {
            console.error('Error accessing webcam:', error);
            setWebcamState('error');
            setTimeout(() => setWebcamState('idle'), 3000);
        }
    };

    const stopWebcam = () => {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            setWebcamStream(null);
            setWebcamState('idle');
        }
    };

    return (
        <div className="preview-container">
            {webcamState === 'idle' && (
                <>
                    <span className="material-icons-round preview-icon">videocam</span>
                    <h4>Webcam Preview</h4>
                    <p>Click the button below to enable webcam access</p>
                    <button className="start-recording-button" onClick={startWebcam}>
                        <span className="material-icons-round">play_circle</span>
                        Start Webcam
                    </button>
                </>
            )}
            {webcamState === 'requesting' && (
                <>
                    <span className="material-icons-round preview-icon spinning">videocam</span>
                    <h4>Requesting Permission</h4>
                    <p>Please allow webcam access in your browser</p>
                </>
            )}
            {webcamState === 'active' && (
                <div className="video-preview">
                    <video
                        ref={webcamVideoRef}
                        autoPlay
                        muted
                        className="webcam-video"
                    />
                    <div className="video-controls">
                        <button className="stop-recording-button" onClick={stopWebcam}>
                            <span className="material-icons-round">stop_circle</span>
                            Stop Webcam
                        </button>
                    </div>
                </div>
            )}
            {webcamState === 'error' && (
                <>
                    <span className="material-icons-round preview-icon error">error</span>
                    <h4>Permission Denied</h4>
                    <p>Webcam access was denied. Please try again.</p>
                </>
            )}
        </div>
    );
}
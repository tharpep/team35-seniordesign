import { useState, useRef, useEffect } from 'react';

type CameraState = 'idle' | 'requesting' | 'active' | 'error' | 'no-device';

interface ExternalCameraPreviewProps {
    isActive: boolean;
    deviceId: string | null;
    deviceLabel?: string;
    onStreamChange?: (stream: MediaStream | null) => void;
}

export default function ExternalCameraPreview({ 
    isActive, 
    deviceId, 
    deviceLabel = 'External Camera',
    onStreamChange 
}: ExternalCameraPreviewProps) {
    const [cameraState, setCameraState] = useState<CameraState>('idle');
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const cameraVideoRef = useRef<HTMLVideoElement>(null);

    // Clean up stream when component becomes inactive
    useEffect(() => {
        if (!isActive && cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            setCameraState('idle');
        }
    }, [isActive, cameraStream]);

    // Update video element when stream changes
    useEffect(() => {
        if (cameraVideoRef.current && cameraStream) {
            cameraVideoRef.current.srcObject = cameraStream;
        }
        if (onStreamChange) {
            onStreamChange(cameraStream);
        }
    }, [cameraStream, onStreamChange]);

    // Check if device is available
    useEffect(() => {
        if (!deviceId) {
            setCameraState('no-device');
        } else if (cameraState === 'no-device') {
            setCameraState('idle');
        }
    }, [deviceId, cameraState]);

    const startCamera = async () => {
        if (!deviceId) {
            setCameraState('no-device');
            return;
        }

        setCameraState('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } },
                audio: false
            });
            
            setCameraStream(stream);
            setCameraState('active');

            // Handle stream ending (user revokes permission or device disconnected)
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                setCameraStream(null);
                setCameraState('idle');
            });
        } catch (error) {
            console.error('Error accessing external camera:', error);
            setCameraState('error');
            setTimeout(() => setCameraState('idle'), 3000);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            setCameraState('idle');
        }
    };

    return (
        <div className="preview-container">
            {cameraState === 'no-device' && (
                <>
                    <span className="material-icons-round preview-icon">camera_alt</span>
                    <h4>No External Camera Found</h4>
                    <p>Connect an external camera (like smart glasses) to preview it here</p>
                </>
            )}
            {cameraState === 'idle' && deviceId && (
                <>
                    <span className="material-icons-round preview-icon">camera_alt</span>
                    <h4>{deviceLabel} Preview</h4>
                    <p>Click the button below to enable camera access</p>
                    <button className="start-recording-button" onClick={startCamera}>
                        <span className="material-icons-round">play_circle</span>
                        Start Camera
                    </button>
                </>
            )}
            {cameraState === 'requesting' && (
                <>
                    <span className="material-icons-round preview-icon spinning">camera_alt</span>
                    <h4>Requesting Permission</h4>
                    <p>Please allow camera access in your browser</p>
                </>
            )}
            {cameraState === 'active' && (
                <div className="video-preview">
                    <video
                        ref={cameraVideoRef}
                        autoPlay
                        muted
                        className="webcam-video"
                    />
                    <div className="video-controls">
                        <button className="stop-recording-button" onClick={stopCamera}>
                            <span className="material-icons-round">stop_circle</span>
                            Stop Camera
                        </button>
                    </div>
                </div>
            )}
            {cameraState === 'error' && (
                <>
                    <span className="material-icons-round preview-icon error">error</span>
                    <h4>Camera Access Failed</h4>
                    <p>Unable to access the external camera. Please check connections and try again.</p>
                </>
            )}
        </div>
    );
}

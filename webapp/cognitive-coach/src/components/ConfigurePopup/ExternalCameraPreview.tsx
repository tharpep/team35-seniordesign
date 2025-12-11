import { useState, useRef, useEffect } from 'react';

type CameraState = 'idle' | 'requesting' | 'active' | 'error' | 'no-device';

interface ExternalCameraPreviewProps {
    isActive: boolean;
    deviceId: string | null;
    deviceLabel?: string;
    onStreamChange?: (stream: MediaStream | null) => void;
    availableDevices?: Array<{ deviceId: string; label: string }>;
    onDeviceChange?: (deviceId: string) => void;
    excludeDeviceId?: string | null;
}

export default function ExternalCameraPreview({ 
    isActive, 
    deviceId, 
    deviceLabel = 'External Camera',
    onStreamChange,
    availableDevices = [],
    onDeviceChange,
    excludeDeviceId
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
            console.log('Setting srcObject for external camera video element');
            cameraVideoRef.current.srcObject = cameraStream;
            // Ensure video plays
            cameraVideoRef.current.play().catch(err => {
                console.error('Error playing video:', err);
            });
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
            console.log('Requesting external camera stream with deviceId:', deviceId);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    deviceId: { exact: deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });
            
            console.log('External camera stream obtained:', stream.getVideoTracks()[0].getSettings());
            setCameraStream(stream);
            setCameraState('active');

            // Handle stream ending (user revokes permission or device disconnected)
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                setCameraStream(null);
                setCameraState('idle');
            });
        } catch (error) {
            console.error('Error accessing external camera:', error);
            console.error('Device ID attempted:', deviceId);
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
                    <h4>External Camera</h4>
                    {availableDevices.length > 0 && onDeviceChange && (
                        <div style={{ width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
                            <select
                                value={deviceId || ''}
                                onChange={(e) => onDeviceChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontSize: '14px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: 'white'
                                }}
                            >
                                <option value="">Do not use</option>
                                {availableDevices
                                    .filter(device => device.deviceId !== excludeDeviceId)
                                    .map(device => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}
                    <p>Connect an external camera or select from available devices</p>
                </>
            )}
            {cameraState === 'idle' && deviceId && (
                <>
                    <span className="material-icons-round preview-icon">camera_alt</span>
                    <h4>External Camera Preview</h4>
                    {availableDevices.length > 0 && onDeviceChange && (
                        <div style={{ width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
                            <select
                                value={deviceId || ''}
                                onChange={(e) => onDeviceChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontSize: '14px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: 'white'
                                }}
                            >
                                <option value="">Do not use</option>
                                {availableDevices
                                    .filter(device => device.deviceId !== excludeDeviceId)
                                    .map(device => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}
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
                        playsInline
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

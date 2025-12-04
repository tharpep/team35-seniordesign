import { useState, useRef, useEffect } from 'react';

type WebcamState = 'idle' | 'requesting' | 'active' | 'error';

interface WebcamPreviewProps {
    isActive: boolean;
    deviceId?: string | null;
    deviceLabel?: string;
    onStreamChange?: (stream: MediaStream | null) => void;
    availableDevices?: Array<{ deviceId: string; label: string }>;
    onDeviceChange?: (deviceId: string) => void;
}

export default function WebcamPreview({ isActive, deviceId, deviceLabel = 'Webcam', onStreamChange, availableDevices = [], onDeviceChange }: WebcamPreviewProps) {
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

    // Stop current stream if selected device becomes unavailable
    useEffect(() => {
        if (!deviceId && webcamStream) {
            stopWebcam();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    const startWebcam = async () => {
        if (!deviceId) {
            setWebcamState('error');
            setTimeout(() => setWebcamState('idle'), 3000);
            return;
        }
        setWebcamState('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
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
                    <h4>{deviceLabel} Preview</h4>
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
                                <option value="" disabled>Select a camera</option>
                                {availableDevices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <p>{deviceId ? 'Click below to enable this camera' : 'Select a camera in the dropdown to preview'}</p>
                    <button className="start-recording-button" onClick={startWebcam} disabled={!deviceId}>
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
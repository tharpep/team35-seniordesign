import { useState, useEffect, useRef } from 'react';
import './CurrentSession.css';

type SessionState = 'idle' | 'active' | 'paused';

interface SessionSettings {
    photoInterval: number;
}

interface CurrentSessionProps {
    onConfigureClick: () => void;
    sessionSettings?: SessionSettings;
}

export default function CurrentSession({ onConfigureClick, sessionSettings }: CurrentSessionProps) {
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [sessionTime, setSessionTime] = useState(0); // in seconds
    const [captureCount, setCaptureCount] = useState(0);
    const [videoDevices, setVideoDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
    const [externalDeviceId, setExternalDeviceId] = useState<string | null>(null);
    
    const timerIntervalRef = useRef<number | null>(null);
    const captureIntervalRef = useRef<number | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const externalCameraStreamRef = useRef<MediaStream | null>(null);
    const captureCountRef = useRef<number>(0);

    // Enumerate video devices on component mount
    useEffect(() => {
        const enumerateDevices = async () => {
            try {
                // Request permission first to get device labels
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop()); // Stop immediately
                
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices
                    .filter(device => device.kind === 'videoinput')
                    .map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || `Camera ${device.deviceId.slice(-4)}`
                    }));
                
                setVideoDevices(videoInputs);
                
                // Set external device as the second camera if available
                if (videoInputs.length > 1) {
                    setExternalDeviceId(videoInputs[1].deviceId);
                }
            } catch (error) {
                console.error('Error enumerating devices:', error);
            }
        };
        
        enumerateDevices();
    }, []);

    // Timer effect - runs every second when session is active
    useEffect(() => {
        if (sessionState === 'active') {
            timerIntervalRef.current = window.setInterval(() => {
                setSessionTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [sessionState]);

    // Capture effect - runs at configured interval when session is active
    useEffect(() => {
        if (sessionState === 'active') {
            const intervalMs = (sessionSettings?.photoInterval || 2) * 1000; // Default to 2 seconds
            captureIntervalRef.current = window.setInterval(async () => {
                // Update ref and state
                captureCountRef.current += 1;
                const newCount = captureCountRef.current;
                const timestamp = new Date().toLocaleTimeString();
                
                // Get current session time from state
                setSessionTime(currentTime => {
                    console.log(`Capture ${newCount} at ${timestamp} - Session time: ${formatTime(currentTime)}`);
                    return currentTime; // Don't modify, just access
                });
                
                // Capture photos asynchronously
                try {
                    const webcamSuccess = await captureWebcamPhoto();
                    const screenSuccess = await captureScreenPhoto();
                    const externalSuccess = await captureExternalCameraPhoto();
                    
                    // Log results based on what succeeded
                    const results = [];
                    if (webcamSuccess) results.push('webcam');
                    if (screenSuccess) results.push('screen');
                    if (externalSuccess) results.push('external');
                    
                    if (results.length > 0) {
                        console.log(`✓ Captured from: ${results.join(', ')}`);
                    } else {
                        console.log(`✗ All captures failed`);
                    }
                } catch (error) {
                    console.error('Error during photo capture:', error);
                }
                
                // Update the state for UI
                setCaptureCount(newCount);
            }, intervalMs);
        } else {
            if (captureIntervalRef.current) {
                clearInterval(captureIntervalRef.current);
                captureIntervalRef.current = null;
            }
        }

        return () => {
            if (captureIntervalRef.current) {
                clearInterval(captureIntervalRef.current);
            }
        };
    }, [sessionState, sessionSettings]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            cleanupStreams();
        };
    }, []);

    // Format time helper function
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    };

    // Check and log resolution for a video stream
    const checkStreamResolution = (stream: MediaStream, sourceName: string): Promise<{ width: number; height: number; is1080pOrHigher: boolean }> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.muted = true;
            video.play();

            video.onloadedmetadata = () => {
                const width = video.videoWidth;
                const height = video.videoHeight;
                const is1080pOrHigher = height >= 1080;
                
                console.log(`📹 ${sourceName} Resolution: ${width}x${height} ${is1080pOrHigher ? '✅ (1080p+)' : '⚠️ (Below 1080p)'}`);
                
                video.remove();
                resolve({ width, height, is1080pOrHigher });
            };
        });
    };

    // Check all stream resolutions and log summary
    const checkAllStreamResolutions = async () => {
        const results = [];
        
        if (webcamStreamRef.current) {
            const webcamResult = await checkStreamResolution(webcamStreamRef.current, 'Webcam');
            results.push({ source: 'Webcam', ...webcamResult });
        }
        
        if (screenStreamRef.current) {
            const screenResult = await checkStreamResolution(screenStreamRef.current, 'Screen Capture');
            results.push({ source: 'Screen Capture', ...screenResult });
        }
        
        if (externalCameraStreamRef.current) {
            const externalResult = await checkStreamResolution(externalCameraStreamRef.current, 'External Camera');
            results.push({ source: 'External Camera', ...externalResult });
        }

        // Log summary
        const allHighRes = results.every(r => r.is1080pOrHigher);
        const totalSources = results.length;
        const highResSources = results.filter(r => r.is1080pOrHigher).length;
        
        console.log(`📊 Resolution Summary: ${highResSources}/${totalSources} sources at 1080p+ ${allHighRes ? '✅ All streams meet requirements' : '⚠️ Some streams below 1080p'}`);
        
        return { allHighRes, results };
    };

    // Initialize camera streams
    const initializeStreams = async () => {
        try {
            // Initialize webcam stream with high resolution preference
            if (!webcamStreamRef.current) {
                const webcamStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                });
                webcamStreamRef.current = webcamStream;
            }

            // Initialize screen capture stream with high resolution preference
            if (!screenStreamRef.current) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                });
                screenStreamRef.current = screenStream;

                // Handle screen share ending
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    screenStreamRef.current = null;
                    console.log('Screen sharing ended by user');
                });
            }

            // Initialize external camera stream (optional) with high resolution preference
            if (externalDeviceId && !externalCameraStreamRef.current) {
                try {
                    const externalStream = await navigator.mediaDevices.getUserMedia({
                        video: { 
                            deviceId: { exact: externalDeviceId },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30 }
                        },
                        audio: false
                    });
                    externalCameraStreamRef.current = externalStream;
                    console.log('External camera initialized successfully');
                } catch (externalError) {
                    console.warn('External camera not available:', externalError);
                    // Don't fail the whole initialization if external camera fails
                }
            }

            // Check and log resolutions after initialization
            console.log('🔍 Checking stream resolutions...');
            await checkAllStreamResolutions();

            return true;
        } catch (error) {
            console.error('Failed to initialize camera streams:', error);
            return false;
        }
    };

    // Capture photo from webcam
    const captureWebcamPhoto = async (): Promise<boolean> => {
        try {
            if (!webcamStreamRef.current) {
                return false;
            }

            const video = document.createElement('video');
            video.srcObject = webcamStreamRef.current;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Log capture resolution
                    console.log(`📸 Webcam capture: ${video.videoWidth}x${video.videoHeight}`);
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        // Photo captured successfully (not storing, just discarding)
                        video.remove();
                        resolve(true);
                    } else {
                        video.remove();
                        resolve(false);
                    }
                };
            });
        } catch (error) {
            console.error('Failed to capture webcam photo:', error);
            return false;
        }
    };

    // Capture photo from screen
    const captureScreenPhoto = async (): Promise<boolean> => {
        try {
            if (!screenStreamRef.current) {
                return false;
            }

            const video = document.createElement('video');
            video.srcObject = screenStreamRef.current;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Log capture resolution
                    console.log(`📸 Screen capture: ${video.videoWidth}x${video.videoHeight}`);
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        // Photo captured successfully (not storing, just discarding)
                        video.remove();
                        resolve(true);
                    } else {
                        video.remove();
                        resolve(false);
                    }
                };
            });
        } catch (error) {
            console.error('Failed to capture screen photo:', error);
            return false;
        }
    };    // Capture photo from external camera
    const captureExternalCameraPhoto = async (): Promise<boolean> => {
        try {
            if (!externalCameraStreamRef.current) {
                // Return false but don't log error since external camera is optional
                return false;
            }

            const video = document.createElement('video');
            video.srcObject = externalCameraStreamRef.current;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Log capture resolution
                    console.log(`📸 External camera capture: ${video.videoWidth}x${video.videoHeight}`);
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        // Photo captured successfully (not storing, just discarding)
                        video.remove();
                        resolve(true);
                    } else {
                        video.remove();
                        resolve(false);
                    }
                };
            });
        } catch (error) {
            console.error('Failed to capture external camera photo:', error);
            return false;
        }
    };

    // Cleanup streams
    const cleanupStreams = () => {
        if (webcamStreamRef.current) {
            webcamStreamRef.current.getTracks().forEach(track => track.stop());
            webcamStreamRef.current = null;
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
        if (externalCameraStreamRef.current) {
            externalCameraStreamRef.current.getTracks().forEach(track => track.stop());
            externalCameraStreamRef.current = null;
        }
    };

    const handleStartSession = async () => {
        const streamsInitialized = await initializeStreams();
        if (streamsInitialized) {
            setSessionState('active');
            setSessionTime(0);
            captureCountRef.current = 0;
            console.log('Session started - streams initialized');
        } else {
            console.error('Failed to start session - could not initialize camera streams');
        }
    };

    const handleResumeSession = () => {
        setSessionState('active');
        console.log('Session resumed');
    };

    const handlePauseSession = () => {
        setSessionState('paused');
        console.log('Session paused');
    };

    const handleStopSession = () => {
        cleanupStreams();
        setSessionState('idle');
        setSessionTime(0);
        captureCountRef.current = 0;
        console.log('Session stopped - streams cleaned up');
    };

    return (
        <div className="current-session card card-large">
            <div className="session-title">
                <h1>Current Session</h1>
                <div className="session-status">
                    <div className="status-dot"></div>
                    All systems ready • {videoDevices.length + 1} cameras detected
                    {sessionState === 'active' && captureCount > 0 && (
                        <span> • {captureCount} captures</span>
                    )}
                </div>
                {sessionState !== 'idle' && (
                    <div className="session-timer">
                        {formatTime(sessionTime)}
                    </div>
                )}
            </div>

            <div className="controls-container">
                <div className="control-buttons">
                    {sessionState === 'idle' ? (
                        <button 
                            className="primary-button"
                            onClick={handleStartSession}
                        >
                            <span className="material-icons-round">play_arrow</span>
                            Start Session
                        </button>
                    ) : sessionState === 'paused' ? (
                        <>
                            <button 
                                className="primary-button"
                                onClick={handleResumeSession}
                            >
                                <span className="material-icons-round">play_arrow</span>
                                Resume
                            </button>
                            <button 
                                className="primary-button stop"
                                onClick={handleStopSession}
                            >
                                <span className="material-icons-round">stop</span>
                                Stop
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                className="primary-button pause"
                                onClick={handlePauseSession}
                            >
                                <span className="material-icons-round">pause</span>
                                Pause
                            </button>
                            <button 
                                className="primary-button stop"
                                onClick={handleStopSession}
                            >
                                <span className="material-icons-round">stop</span>
                                Stop
                            </button>
                        </>
                    )}
                    <button 
                        className="icon-button-circular" 
                        title="Configure cameras"
                        onClick={onConfigureClick}
                    >
                        <span className="material-icons-round">settings</span>
                    </button>
                </div>

                <div className="quick-metrics">
                    <div className="metric-chip focus">
                        <div className="metric-icon focus"></div>
                        Focus: Good
                    </div>
                    <div className="metric-chip emotion">
                        <div className="metric-icon emotion"></div>
                        Emotion: Calm
                    </div>
                    <div className="metric-chip stress">
                        <div className="metric-icon stress"></div>
                        Artifacts: 12
                    </div>
                </div>
            </div>
        </div>
    );
}
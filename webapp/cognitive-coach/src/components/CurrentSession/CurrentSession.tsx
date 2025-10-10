import { useState, useEffect, useRef } from 'react';
import './CurrentSession.css';

type SessionState = 'idle' | 'active' | 'paused';

interface CurrentSessionProps {
    onConfigureClick: () => void;
}

export default function CurrentSession({ onConfigureClick }: CurrentSessionProps) {
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [sessionTime, setSessionTime] = useState(0); // in seconds
    const timerIntervalRef = useRef<number | null>(null);
    const captureIntervalRef = useRef<number | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const captureCountRef = useRef<number>(0);

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

    // Capture effect - runs every 5 seconds when session is active
    useEffect(() => {
        if (sessionState === 'active') {
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
                    
                    if (webcamSuccess && screenSuccess) {
                        console.log(`✓ Both webcam and screen photos captured successfully`);
                    } else if (webcamSuccess) {
                        console.log(`✓ Webcam photo captured, ✗ Screen capture failed`);
                    } else if (screenSuccess) {
                        console.log(`✗ Webcam capture failed, ✓ Screen photo captured`);
                    } else {
                        console.log(`✗ Both captures failed`);
                    }
                } catch (error) {
                    console.error('Error during photo capture:', error);
                }
            }, 5000);
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
    }, [sessionState]);

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

    // Initialize camera streams
    const initializeStreams = async () => {
        try {
            // Initialize webcam stream
            if (!webcamStreamRef.current) {
                const webcamStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
                webcamStreamRef.current = webcamStream;
            }

            // Initialize screen capture stream
            if (!screenStreamRef.current) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
                screenStreamRef.current = screenStream;

                // Handle screen share ending
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    screenStreamRef.current = null;
                    console.log('Screen sharing ended by user');
                });
            }

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
                    All systems ready • 3 cameras detected
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
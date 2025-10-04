import { useState, useEffect, useRef } from 'react';
import './CurrentSession.css';
import { api } from '../../services/api';

type SessionState = 'idle' | 'active' | 'paused';

interface CurrentSessionProps {
    onConfigureClick: () => void;
}

export default function CurrentSession({ onConfigureClick }: CurrentSessionProps) {
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [sessionTime, setSessionTime] = useState(0);
    const [captureCount, setCaptureCount] = useState(0);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    
    const timerIntervalRef = useRef<number | null>(null);
    const captureIntervalRef = useRef<number | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const captureCountRef = useRef<number>(0);

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

    useEffect(() => {
        if (sessionState === 'active' && currentSessionId) {
            captureIntervalRef.current = window.setInterval(async () => {
                captureCountRef.current += 1;
                const newCount = captureCountRef.current;
                const timestamp = new Date().toLocaleTimeString();
                
                setSessionTime(currentTime => {
                    console.log(`Capture ${newCount} at ${timestamp} - Session time: ${formatTime(currentTime)}`);
                    return currentTime;
                });
                
                try {
                    const webcamSuccess = await captureAndUploadWebcam();
                    const screenSuccess = await captureAndUploadScreen();
                    
                    if (webcamSuccess && screenSuccess) {
                        console.log(`✓ Both webcam and screen photos captured & uploaded`);
                    } else if (webcamSuccess) {
                        console.log(`✓ Webcam captured, ✗ Screen capture failed`);
                    } else if (screenSuccess) {
                        console.log(`✗ Webcam failed, ✓ Screen captured`);
                    } else {
                        console.log(`✗ Both captures failed`);
                    }
                } catch (error) {
                    console.error('Error during photo capture:', error);
                }
                
                setCaptureCount(newCount);
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
    }, [sessionState, currentSessionId]);

    useEffect(() => {
        return () => {
            cleanupStreams();
        };
    }, []);

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

    const initializeStreams = async () => {
        let hasAtLeastOneStream = false;

        // Try to initialize webcam (optional)
        if (!webcamStreamRef.current) {
            try {
                const webcamStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
                webcamStreamRef.current = webcamStream;
                hasAtLeastOneStream = true;
                console.log('✓ Webcam initialized');
            } catch (error) {
                console.warn('⚠ Webcam not available:', error.message);
            }
        } else {
            hasAtLeastOneStream = true;
        }

        // Try to initialize screen capture (optional)
        if (!screenStreamRef.current) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
                screenStreamRef.current = screenStream;
                hasAtLeastOneStream = true;
                console.log('✓ Screen capture initialized');

                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    screenStreamRef.current = null;
                    console.log('Screen sharing ended by user');
                });
            } catch (error) {
                console.warn('⚠ Screen capture not available:', error.message);
            }
        } else {
            hasAtLeastOneStream = true;
        }

        if (!hasAtLeastOneStream) {
            console.error('No camera or screen capture available');
            alert('Please allow access to at least a webcam or screen sharing to start a session.');
            return false;
        }

        return true;
    };

    const captureAndUploadWebcam = async (): Promise<boolean> => {
        try {
            if (!webcamStreamRef.current || !currentSessionId) return false;

            const video = document.createElement('video');
            video.srcObject = webcamStreamRef.current;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        
                        // Convert canvas to blob
                        canvas.toBlob(async (blob) => {
                            if (blob && currentSessionId) {
                                try {
                                    await api.uploadFrame(currentSessionId, blob, 'webcam');
                                    console.log('Webcam frame uploaded successfully');
                                    resolve(true);
                                } catch (error) {
                                    console.error('Failed to upload webcam frame:', error);
                                    resolve(false);
                                }
                            } else {
                                resolve(false);
                            }
                            video.remove();
                        }, 'image/jpeg', 0.9);
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

    const captureAndUploadScreen = async (): Promise<boolean> => {
        try {
            if (!screenStreamRef.current || !currentSessionId) return false;

            const video = document.createElement('video');
            video.srcObject = screenStreamRef.current;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        
                        // Convert canvas to blob
                        canvas.toBlob(async (blob) => {
                            if (blob && currentSessionId) {
                                try {
                                    await api.uploadFrame(currentSessionId, blob, 'screen');
                                    console.log('Screen frame uploaded successfully');
                                    resolve(true);
                                } catch (error) {
                                    console.error('Failed to upload screen frame:', error);
                                    resolve(false);
                                }
                            } else {
                                resolve(false);
                            }
                            video.remove();
                        }, 'image/jpeg', 0.9);
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
            try {
                // Create session in backend
                const session = await api.createSession({
                    title: 'Study Session ' + new Date().toLocaleString()
                });
                
                setCurrentSessionId(session.id);
                setSessionState('active');
                setSessionTime(0);
                setCaptureCount(0);
                captureCountRef.current = 0;
                console.log('Session started - ID:', session.id);
            } catch (error) {
                console.error('Failed to create session:', error);
                cleanupStreams();
            }
        } else {
            console.error('Failed to start session - could not initialize camera streams');
        }
    };

    const handleResumeSession = () => {
        setSessionState('active');
        console.log('Session resumed');
    };

    const handlePauseSession = async () => {
        setSessionState('paused');
        
        if (currentSessionId) {
            try {
                await api.updateSession(currentSessionId, { status: 'paused' });
            } catch (error) {
                console.error('Failed to update session status:', error);
            }
        }
        
        console.log('Session paused');
    };

    const handleStopSession = async () => {
        if (currentSessionId) {
            try {
                await api.updateSession(currentSessionId, {
                    status: 'completed',
                    end_time: new Date().toISOString(),
                    duration: sessionTime
                });
            } catch (error) {
                console.error('Failed to update session:', error);
            }
        }
        
        cleanupStreams();
        setSessionState('idle');
        setSessionTime(0);
        setCaptureCount(0);
        captureCountRef.current = 0;
        setCurrentSessionId(null);
        console.log('Session stopped');
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
                        Stress: Low
                    </div>
                </div>
            </div>
        </div>
    );
}
import { useState, useEffect, useRef } from 'react';
import './CurrentSession.css';
import { api } from '../../services/api';
import { subscribeToMaterials, unsubscribeFromMaterials } from '../../services/socket';

type SessionState = 'idle' | 'active' | 'paused';

interface SessionSettings {
    photoInterval: number;
}

interface CurrentSessionProps {
    onConfigureClick: () => void;
    sessionSettings?: SessionSettings;
    onSessionStateChange?: (state: SessionState) => void;
    onSessionIdChange?: (sessionId: number | null) => void;
    onArtifactsChange?: (artifacts: any[]) => void;
    webcamDeviceId?: string | null;
    externalDeviceId?: string | null;
}

interface CameraStream {
    stream: MediaStream;
    type: 'webcam' | 'screen' | 'external';
    deviceId?: string;
}

export default function CurrentSession({ onConfigureClick, sessionSettings, onSessionStateChange, onSessionIdChange, onArtifactsChange, webcamDeviceId, externalDeviceId }: CurrentSessionProps) {
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [sessionTime, setSessionTime] = useState(0); // in seconds - actual operating time
    const [captureCount, setCaptureCount] = useState(0);
    const [videoDevices, setVideoDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const [lastResumeTime, setLastResumeTime] = useState<Date | null>(null);
    const [artifactCount, setArtifactCount] = useState(0);
    const [artifacts, setArtifacts] = useState<any[]>([]);
    
    const timerIntervalRef = useRef<number | null>(null);
    const captureIntervalRef = useRef<number | null>(null);
    const activeStreamsRef = useRef<CameraStream[]>([]);
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
                console.log(`📹 Detected ${videoInputs.length} camera(s):`, videoInputs.map((v, i) => `[${i}] ${v.label}`).join(', '));
            } catch (error) {
                console.error('Error enumerating devices:', error);
            }
        };
        
        enumerateDevices();
    }, []);

    // Check for incomplete session on component mount
    useEffect(() => {
        const checkIncompleteSession = async () => {
            try {
                console.log('Checking for incomplete session...');
                const incompleteSession = await api.getIncompleteSession();
                
                console.log('Incomplete session result:', incompleteSession);
                
                if (incompleteSession) {
                    console.log('✓ Found incomplete session - restoring:', incompleteSession);
                    
                    // Restore session state
                    setCurrentSessionId(incompleteSession.id);
                    setSessionState('paused'); // Always restore as paused
                    setArtifactCount(incompleteSession.artifact_count || 0);
                    
                    // Use duration from database if available, otherwise calculate from start_time
                    let elapsedSeconds = 0;
                    if (incompleteSession.duration) {
                        elapsedSeconds = incompleteSession.duration;
                    } else if (incompleteSession.start_time) {
                        // Fallback to calculating from start time
                        const startTime = new Date(incompleteSession.start_time + 'Z');
                        const now = new Date();
                        elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                    }
                    
                    setSessionTime(elapsedSeconds);
                    
                    console.log(`[Restore] Set sessionId: ${incompleteSession.id}, state: paused, artifactCount: ${incompleteSession.artifact_count || 0}, duration: ${elapsedSeconds}s`);
                    
                    // Calculate elapsed time
                    if (incompleteSession.start_time) {
                        // Parse the start time - SQLite returns UTC time as local string
                        // We need to treat it as UTC and convert properly
                        const startTime = new Date(incompleteSession.start_time + 'Z'); // Add 'Z' to parse as UTC
                        setSessionStartTime(startTime);
                        
                        console.log(`✓ Session restored - ID: ${incompleteSession.id}, Operating time: ${elapsedSeconds}s, Status: paused`);
                    }
                } else {
                    console.log('No incomplete session found');
                }
            } catch (error) {
                console.error('Error checking for incomplete session:', error);
            }
        };
        
        checkIncompleteSession();
    }, []);

    // Notify parent when session state changes
    useEffect(() => {
        if (onSessionStateChange) {
            onSessionStateChange(sessionState);
        }
    }, [sessionState, onSessionStateChange]);

    // Notify parent when session ID changes
    useEffect(() => {
        if (onSessionIdChange) {
            onSessionIdChange(currentSessionId);
        }
    }, [currentSessionId, onSessionIdChange]);

    // Subscribe to artifacts when session is active
    useEffect(() => {
        if (currentSessionId && sessionState !== 'idle') {
            console.log(`[Artifacts] Fetching artifacts for session ${currentSessionId}, state: ${sessionState}`);
            
            // Fetch initial artifacts
            const fetchArtifacts = async () => {
                try {
                    const materials = await api.getMaterials(currentSessionId.toString());
                    console.log(`[Artifacts] Fetched ${materials.length} artifacts:`, materials);
                    setArtifactCount(materials.length);
                    setArtifacts(materials);
                    
                    // Notify parent component
                    if (onArtifactsChange) {
                        onArtifactsChange(materials);
                    }
                } catch (error) {
                    console.error('Error fetching artifacts:', error);
                }
            };
            fetchArtifacts();

            // Subscribe to real-time updates
            subscribeToMaterials(currentSessionId.toString(), (newMaterial) => {
                console.log('New artifact received:', newMaterial);
                setArtifactCount(prev => prev + 1);
                setArtifacts(prev => {
                    const updated = [...prev, newMaterial];
                    // Notify parent component
                    if (onArtifactsChange) {
                        onArtifactsChange(updated);
                    }
                    return updated;
                });
            });

            return () => {
                unsubscribeFromMaterials(currentSessionId.toString());
            };
        } else {
            console.log(`[Artifacts] Not fetching - sessionId: ${currentSessionId}, state: ${sessionState}`);
        }
    }, [currentSessionId, sessionState, onArtifactsChange]);

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
        if (sessionState === 'active' && currentSessionId) {
            const intervalMs = (sessionSettings?.photoInterval || 2) * 1000;
            captureIntervalRef.current = window.setInterval(async () => {
                captureCountRef.current += 1;
                const newCount = captureCountRef.current;
                const timestamp = new Date().toLocaleTimeString();
                
                setSessionTime(currentTime => {
                    console.log(`📸 Capture ${newCount} at ${timestamp} - Session time: ${formatTime(currentTime)} - Active streams: ${activeStreamsRef.current.map(s => s.type).join(', ')}`);
                    return currentTime;
                });
                
                // Capture and upload from all active streams
                const uploadPromises = activeStreamsRef.current.map(async (cameraStream) => {
                    try {
                        console.log(`⏳ Capturing from ${cameraStream.type}...`);
                        const blob = await captureFrameFromStream(cameraStream.stream);
                        if (blob) {
                            console.log(`⏳ Uploading ${cameraStream.type} frame (${(blob.size / 1024).toFixed(1)} KB)...`);
                            await api.uploadFrame(currentSessionId.toString(), blob, cameraStream.type);
                            console.log(`✓ Captured and uploaded from: ${cameraStream.type}`);
                            return true;
                        } else {
                            console.warn(`⚠️ No blob captured from ${cameraStream.type}`);
                        }
                        return false;
                    } catch (error) {
                        console.error(`✗ Failed to capture from ${cameraStream.type}:`, error);
                        return false;
                    }
                });

                await Promise.all(uploadPromises);
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
    }, [sessionState, sessionSettings, currentSessionId]);

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

    // Capture frame from a media stream and return as Blob
    const captureFrameFromStream = async (stream: MediaStream): Promise<Blob | null> => {
        try {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.muted = true;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        canvas.toBlob((blob) => {
                            video.remove();
                            resolve(blob);
                        }, 'image/jpeg', 0.95);
                    } else {
                        video.remove();
                        resolve(null);
                    }
                };
            });
        } catch (error) {
            console.error('Failed to capture frame:', error);
            return null;
        }
    };

    // Check all stream resolutions and log summary
    const checkAllStreamResolutions = async () => {
        const results = [];
        
        for (const cameraStream of activeStreamsRef.current) {
            const result = await checkStreamResolution(cameraStream.stream, cameraStream.type);
            results.push({ source: cameraStream.type, ...result });
        }

        // Log summary
        const allHighRes = results.every(r => r.is1080pOrHigher);
        const totalSources = results.length;
        const highResSources = results.filter(r => r.is1080pOrHigher).length;
        
        console.log(`📊 Resolution Summary: ${highResSources}/${totalSources} sources at 1080p+ ${allHighRes ? '✅ All streams meet requirements' : '⚠️ Some streams below 1080p'}`);
        
        return { allHighRes, results };
    };

    // Initialize camera streams - only for detected cameras
    const initializeStreams = async (): Promise<boolean> => {
        try {
            activeStreamsRef.current = [];
            console.log(`🎥 Initializing camera streams...`);
            console.log(`  Webcam deviceId: ${webcamDeviceId || 'default'}`);
            console.log(`  External deviceId: ${externalDeviceId || 'none'}`);

            // Try to initialize webcam with user-selected device
            if (webcamDeviceId) {
                try {
                    const webcamConstraints: MediaStreamConstraints = {
                        video: {
                            deviceId: { exact: webcamDeviceId },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30 }
                        },
                        audio: false
                    };
                    const webcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
                    activeStreamsRef.current.push({ stream: webcamStream, type: 'webcam', deviceId: webcamDeviceId });
                    console.log(`✓ Webcam initialized: ${videoDevices.find(d => d.deviceId === webcamDeviceId)?.label || webcamDeviceId}`);
                } catch (error) {
                    console.error('❌ Webcam initialization failed:', error);
                }
            } else {
                console.warn('⚠️ No webcam device selected');
            }

            // Try to initialize screen capture
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                });
                
                // Handle screen share ending
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    const index = activeStreamsRef.current.findIndex(s => s.type === 'screen');
                    if (index !== -1) {
                        activeStreamsRef.current.splice(index, 1);
                    }
                    console.log('Screen sharing ended by user');
                });

                activeStreamsRef.current.push({ stream: screenStream, type: 'screen' });
                console.log('✓ Screen capture initialized');
            } catch (error) {
                console.warn('Screen capture not available:', error);
            }

            // Try to initialize external camera if selected by user
            if (externalDeviceId) {
                try {
                    console.log(`🔌 Attempting to initialize external camera: ${videoDevices.find(d => d.deviceId === externalDeviceId)?.label || externalDeviceId}`);
                    const externalStream = await navigator.mediaDevices.getUserMedia({
                        video: { 
                            deviceId: { exact: externalDeviceId },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30 }
                        },
                        audio: false
                    });
                    activeStreamsRef.current.push({ 
                        stream: externalStream, 
                        type: 'external',
                        deviceId: externalDeviceId 
                    });
                    console.log('✓ External camera initialized successfully');
                } catch (error) {
                    console.error('❌ External camera initialization failed:', error);
                }
            } else {
                console.log('ℹ️ No external camera selected');
            }

            // Must have at least one stream
            if (activeStreamsRef.current.length === 0) {
                console.error('No camera streams available');
                return false;
            }

            // Check and log resolutions
            console.log(`📊 Successfully initialized ${activeStreamsRef.current.length} stream(s): ${activeStreamsRef.current.map(s => s.type).join(', ')}`);
            console.log('🔍 Checking stream resolutions...');
            await checkAllStreamResolutions();

            return true;
        } catch (error) {
            console.error('Failed to initialize camera streams:', error);
            return false;
        }
    };

    // Cleanup streams
    const cleanupStreams = () => {
        activeStreamsRef.current.forEach(cameraStream => {
            cameraStream.stream.getTracks().forEach(track => track.stop());
        });
        activeStreamsRef.current = [];
        console.log('All streams cleaned up');
    };

    const handleStartSession = async () => {
        try {
            // Check if we already have a session ID (restored session)
            if (currentSessionId) {
                // This is a restored session, just resume it
                await handleResumeSession();
                return;
            }

            // No existing session, create a new one
            // Initialize camera streams first
            const streamsInitialized = await initializeStreams();
            if (!streamsInitialized) {
                console.error('Failed to start session - could not initialize camera streams');
                alert('Could not initialize camera streams. Please check permissions and try again.');
                return;
            }

            // Create session in database
            const session = await api.createSession({
                title: `Study Session - ${new Date().toLocaleString()}`
            });

            setCurrentSessionId(session.id);
            setSessionStartTime(new Date());
            setSessionState('active');
            setSessionTime(0);
            setArtifactCount(0);
            captureCountRef.current = 0;
            
            console.log(`Session started - ID: ${session.id}, Streams: ${activeStreamsRef.current.map(s => s.type).join(', ')}`);
        } catch (error) {
            console.error('Failed to start session:', error);
            cleanupStreams();
            alert('Failed to create session. Please try again.');
        }
    };

    const handleResumeSession = async () => {
        if (!currentSessionId) return;
        
        try {
            // Reinitialize camera streams
            const streamsInitialized = await initializeStreams();
            if (!streamsInitialized) {
                console.error('Failed to resume session - could not initialize camera streams');
                alert('Could not initialize camera streams. Please check permissions and try again.');
                return;
            }

            await api.updateSession(currentSessionId.toString(), { status: 'active' });
            setSessionState('active');
            console.log('Session resumed with streams:', activeStreamsRef.current.map(s => s.type).join(', '));
        } catch (error) {
            console.error('Failed to resume session:', error);
            alert('Failed to resume session. Please try again.');
        }
    };

    const handlePauseSession = async () => {
        if (!currentSessionId) return;
        
        try {
            // Save the current duration to database when pausing
            await api.updateSession(currentSessionId.toString(), { 
                status: 'paused',
                duration: sessionTime
            });
            setSessionState('paused');
            
            // Cleanup camera streams when pausing
            cleanupStreams();
            
            console.log(`Session paused - Duration saved: ${sessionTime}s`);
        } catch (error) {
            console.error('Failed to pause session:', error);
        }
    };

    const handleStopSession = async () => {
        if (!currentSessionId) return;
        
        try {
            const endTime = new Date();
            
            // Use the accumulated session time (which excludes paused time)
            const finalDuration = sessionTime;
            
            // Update session as completed
            await api.updateSession(currentSessionId.toString(), {
                status: 'completed',
                end_time: endTime.toISOString(),
                duration: finalDuration
            });
            
            console.log(`Session stopped - Duration: ${finalDuration}s, Captures: ${captureCountRef.current}, Artifacts: ${artifactCount}`);
            
            // Cleanup
            cleanupStreams();
            setSessionState('idle');
            setSessionTime(0);
            setCurrentSessionId(null);
            setSessionStartTime(null);
            setLastResumeTime(null);
            setArtifactCount(0);
            captureCountRef.current = 0;
        } catch (error) {
            console.error('Failed to stop session:', error);
            // Still cleanup locally even if server update fails
            cleanupStreams();
            setSessionState('idle');
            setSessionTime(0);
            setCurrentSessionId(null);
            setSessionStartTime(null);
            setLastResumeTime(null);
            setArtifactCount(0);
            captureCountRef.current = 0;
        }
    };

    return (
        <div className="current-session card card-large">
            <div className="session-title">
                <h1>Current Session</h1>
                <div className="session-status">
                    <div className={`status-dot ${(videoDevices.length + 1) >= 2 ? 'green' : 'red'}`}></div>
                    {sessionState === 'idle' ? (
                        (videoDevices.length + 1) >= 2 
                            ? `All systems ready • ${videoDevices.length + 1} cameras detected`
                            : `Setup incomplete • ${videoDevices.length + 1} camera${(videoDevices.length + 1) === 1 ? '' : 's'} detected (need 2+)`
                    ) : sessionState === 'paused' ? (
                        `Session paused • ${artifactCount} artifacts`
                    ) : (
                        `Session active • ${captureCount} captures • ${artifactCount} artifacts`
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
                                Resume Session
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
                        Artifacts: {artifactCount}
                    </div>
                </div>
            </div>
        </div>
    );
}
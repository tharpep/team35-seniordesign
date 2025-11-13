import React, { useState, useEffect, useCallback } from 'react';
import './ConfigurePopup.css';
import WebcamPreview from './WebcamPreview';
import ScreenRecordingPreview from './ScreenRecordingPreview';
import ExternalCameraPreview from './ExternalCameraPreview';

interface CameraSelections {
    webcam: string | null;
    external: string | null;
}

interface ConfigurePopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChange?: (settings: { photoInterval: number }) => void;
    cameraSelections: CameraSelections;
    onCameraSelectionChange?: (selection: CameraSelections) => void;
}

interface VideoDevice {
    deviceId: string;
    label: string;
}

type PreviewType = 'screen' | 'webcam' | 'external';
type ConfigSection = 'camera' | 'settings';

export default function ConfigurePopup({ isOpen, onClose, onSettingsChange, cameraSelections, onCameraSelectionChange }: ConfigurePopupProps) {
    const [selectedSection, setSelectedSection] = useState<ConfigSection>('camera');
    const [selectedPreview, setSelectedPreview] = useState<PreviewType>('screen');
    const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
    const [photoInterval, setPhotoInterval] = useState<number>(2); // Default 2 seconds

    const ensureDeviceSelections = useCallback((devices: VideoDevice[]) => {
        if (!onCameraSelectionChange || devices.length === 0) {
            return;
        }

        let nextWebcam = cameraSelections.webcam;
        let nextExternal = cameraSelections.external;
        let changed = false;

        if (!nextWebcam || !devices.some(device => device.deviceId === nextWebcam)) {
            nextWebcam = devices[0]?.deviceId || null;
            changed = true;
        }

        const externalCandidate = devices.find(device => device.deviceId !== nextWebcam);
        if (devices.length < 2) {
            if (nextExternal !== null) {
                nextExternal = null;
                changed = true;
            }
        } else if (!nextExternal || !devices.some(device => device.deviceId === nextExternal) || nextExternal === nextWebcam) {
            nextExternal = externalCandidate ? externalCandidate.deviceId : null;
            changed = true;
        }

        if (changed) {
            onCameraSelectionChange({ webcam: nextWebcam, external: nextExternal });
        }
    }, [cameraSelections, onCameraSelectionChange]);

    // Enumerate video devices when popup opens
    useEffect(() => {
        if (isOpen) {
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
                    ensureDeviceSelections(videoInputs);
                } catch (error) {
                    console.error('Error enumerating devices:', error);
                }
            };
            
            enumerateDevices();
        }
    }, [isOpen, ensureDeviceSelections]);

    useEffect(() => {
        if (!isOpen || videoDevices.length === 0) {
            return;
        }
        ensureDeviceSelections(videoDevices);
    }, [isOpen, videoDevices, ensureDeviceSelections]);

    // Notify parent component when settings change
    useEffect(() => {
        if (onSettingsChange) {
            onSettingsChange({ photoInterval });
        }
    }, [photoInterval, onSettingsChange]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const changeSelectedPreview = (preview: PreviewType) => {
        setSelectedPreview(preview);
    };

    const handleCameraSelectChange = (type: 'webcam' | 'external', value: string) => {
        if (!onCameraSelectionChange) return;
        const normalizedValue = value || null;
        const nextSelection: CameraSelections = {
            ...cameraSelections,
            [type]: normalizedValue
        };

        if (type === 'webcam' && normalizedValue && normalizedValue === nextSelection.external) {
            const fallback = videoDevices.find(device => device.deviceId !== normalizedValue);
            nextSelection.external = fallback ? fallback.deviceId : null;
        }

        if (type === 'external' && normalizedValue && normalizedValue === nextSelection.webcam) {
            const fallback = videoDevices.find(device => device.deviceId !== normalizedValue);
            nextSelection.webcam = fallback ? fallback.deviceId : nextSelection.webcam;
        }

        onCameraSelectionChange(nextSelection);
    };

    const getDeviceLabel = (deviceId: string | null | undefined) =>
        videoDevices.find(device => device.deviceId === deviceId)?.label;

    return (
        <div className="popup-overlay" onClick={handleOverlayClick}>
            <div className="popup-container">
                <div className="popup-header">
                    <h2>Configure Session</h2>
                    <button className="close-button" onClick={onClose}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                    {/* Main Section Tabs */}
                    <div className="main-section-tabs">
                        <button 
                            className={`section-tab ${selectedSection === 'camera' ? 'active' : ''}`}
                            onClick={() => setSelectedSection('camera')}
                        >
                            <span className="material-icons-round">videocam</span>
                            Camera Preview
                        </button>
                        <button 
                            className={`section-tab ${selectedSection === 'settings' ? 'active' : ''}`}
                            onClick={() => setSelectedSection('settings')}
                        >
                            <span className="material-icons-round">settings</span>
                            Settings
                        </button>
                </div>
                <div className="popup-content">
                    {selectedSection === 'camera' ? (
                        <div className="camera-section">
                        <div className="preview-selector">
                            <div className="button-group">
                                <button 
                                    className={`preview-button ${selectedPreview === 'screen' ? 'active' : ''}`}
                                    onClick={() => changeSelectedPreview('screen')}
                                >
                                    <span className="material-icons-round">screen_share</span>
                                    Screen Recording
                                </button>
                                <button 
                                    className={`preview-button ${selectedPreview === 'webcam' ? 'active' : ''}`}
                                    onClick={() => changeSelectedPreview('webcam')}
                                >
                                    <span className="material-icons-round">videocam</span>
                                    Webcam
                                </button>
                                <button 
                                    className={`preview-button ${selectedPreview === 'external' ? 'active' : ''}`}
                                    onClick={() => changeSelectedPreview('external')}
                                >
                                    <span className="material-icons-round">camera_alt</span>
                                    External Camera
                                    {videoDevices.length > 1 && (
                                        <small style={{ display: 'block', fontSize: '0.8em', opacity: 0.8 }}>
                                            {videoDevices.length} cameras detected
                                        </small>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        <div className="camera-config-selectors">
                            {/* Camera selection moved to individual preview windows */}
                        </div>

                            <div className="camera-preview">
                                {selectedPreview === 'screen' ? (
                                    <ScreenRecordingPreview isActive={selectedPreview === 'screen'} />
                                ) : selectedPreview === 'webcam' ? (
                                    <WebcamPreview 
                                        isActive={selectedPreview === 'webcam'}
                                        deviceId={cameraSelections.webcam}
                                        deviceLabel={getDeviceLabel(cameraSelections.webcam) || 'Webcam'}
                                        availableDevices={videoDevices}
                                        onDeviceChange={(deviceId) => handleCameraSelectChange('webcam', deviceId)}
                                    />
                                ) : (
                                    <ExternalCameraPreview 
                                        isActive={selectedPreview === 'external'} 
                                        deviceId={cameraSelections.external}
                                        deviceLabel={getDeviceLabel(cameraSelections.external) || 'External Camera'}
                                        availableDevices={videoDevices}
                                        onDeviceChange={(deviceId) => handleCameraSelectChange('external', deviceId)}
                                        excludeDeviceId={cameraSelections.webcam}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="settings-section">
                            <div className="setting-group">
                                <h3>Photo Capture Settings</h3>
                                <div className="setting-item">
                                    <label htmlFor="photo-interval">Photo Interval (seconds)</label>
                                    <div className="interval-selector">
                                        {[1, 2, 3, 4, 5].map(interval => (
                                            <button
                                                key={interval}
                                                className={`interval-button ${photoInterval === interval ? 'active' : ''}`}
                                                onClick={() => setPhotoInterval(interval)}
                                            >
                                                {interval}s
                                            </button>
                                        ))}
                                    </div>
                                    <p className="setting-description">
                                        Choose how often photos are captured during your session
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
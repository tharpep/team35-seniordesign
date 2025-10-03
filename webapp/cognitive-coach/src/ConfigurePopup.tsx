import React, { useState } from 'react';
import './ConfigurePopup.css';
import WebcamPreview from './WebcamPreview';
import ScreenRecordingPreview from './ScreenRecordingPreview';

interface ConfigurePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

type PreviewType = 'screen' | 'webcam' | 'external';

export default function ConfigurePopup({ isOpen, onClose }: ConfigurePopupProps) {
    const [selectedPreview, setSelectedPreview] = useState<PreviewType>('screen');

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const changeSelectedPreview = (preview: PreviewType) => {
        setSelectedPreview(preview);
    }

    return (
        <div className="popup-overlay" onClick={handleOverlayClick}>
            <div className="popup-container">
                <div className="popup-header">
                    <h2>Preview Cameras</h2>
                    <button className="close-button" onClick={onClose}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                
                <div className="popup-content">
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
                                </button>
                            </div>
                        </div>
                        
                        <div className="camera-preview">
                            {selectedPreview === 'screen' ? (
                                <ScreenRecordingPreview isActive={selectedPreview === 'screen'} />
                            ) : selectedPreview === 'webcam' ? (
                                <WebcamPreview isActive={selectedPreview === 'webcam'} />
                            ) : (
                                <div className="preview-container">
                                    <span className="material-icons-round preview-icon">camera_alt</span>
                                    <h4>External Camera Preview</h4>
                                    <p>Preview functionality will be implemented here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
import React, { useEffect, useRef } from 'react';
import FlashcardContent from './FlashcardContent';
import MCQContent from './MCQContent';
import EquationContent from './EquationContent';
import type { PopupState } from './types';

interface Artifact {
    id: number;
    type: string;
    title: string;
    content: string;
}

interface ArtifactPopupControllerProps {
    popup: PopupState;
    closePopup: () => void;
    navigatePopup: (direction: 'prev' | 'next') => void;
    setPopup: React.Dispatch<React.SetStateAction<PopupState>>;
    artifacts: Artifact[];
    totalCount: number;
}

export default function ArtifactPopupController({
    popup,
    closePopup,
    navigatePopup,
    setPopup,
    artifacts,
    totalCount
}: ArtifactPopupControllerProps) {
    const popupRef = useRef<HTMLDivElement>(null);

    // Filter artifacts by type
    const filteredArtifacts = artifacts.filter(artifact => {
        if (popup.type === 'flashcard') return artifact.type === 'flashcard';
        if (popup.type === 'MCQ') return artifact.type === 'multiple_choice';
        if (popup.type === 'equation') return artifact.type === 'equation';
        return false;
    });

    // Get current artifact
    const currentArtifact = filteredArtifacts[popup.currentIndex];

    // Auto-focus the popup when it opens to enable keyboard navigation
    useEffect(() => {
        if (popup.isOpen && popupRef.current) {
            popupRef.current.focus();
        }
    }, [popup.isOpen]);
    
    const handlePopupKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            closePopup();
        } else if (e.key === 'ArrowLeft') {
            navigatePopup('prev');
        } else if (e.key === 'ArrowRight') {
            navigatePopup('next');
        } else if (e.key === ' ' && popup.type === 'flashcard') {
            e.preventDefault()
            setPopup(prev => ({ ...prev, showBack: !prev.showBack }));
        }
    };

    const renderContent = () => {
        if (!currentArtifact) return <div>No artifact found</div>;

        switch (popup.type) {
            case 'flashcard':
                return <FlashcardContent popup={popup} setPopup={setPopup} artifact={currentArtifact} />;
            case 'MCQ':
                return <MCQContent popup={popup} setPopup={setPopup} artifact={currentArtifact} />;
            case 'equation':
                return <EquationContent popup={popup} setPopup={setPopup} artifact={currentArtifact} />;
            default:
                return null;
        }
    };

    return (
        <div className="artifact-popup-overlay" onClick={closePopup}>
            <div 
                ref={popupRef}
                className="artifact-popup-content" 
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handlePopupKeyPress}
                tabIndex={0}
            >
                <div className="artifact-popup-header">
                    <h3 className="artifact-popup-title">
                        {popup.type === 'flashcard' && `Flashcard ${popup.currentIndex + 1} of ${totalCount}`}
                        {popup.type === 'MCQ' && `Question ${popup.currentIndex + 1} of ${totalCount}`}
                        {popup.type === 'equation' && `Equation ${popup.currentIndex + 1} of ${totalCount}`}
                    </h3>
                    <button className="artifact-popup-close" onClick={closePopup}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                {/* Content rendered by individual components */}
                <div className="artifact-popup-body">
                    {renderContent()}
                </div>

                <div className="artifact-popup-footer">
                    <button 
                        className="nav-button" 
                        onClick={() => navigatePopup('prev')}
                        disabled={popup.currentIndex === 0}
                        title="Previous"
                    >
                        <span className="material-icons-round">chevron_left</span>
                    </button>
                    <button 
                        className="nav-button" 
                        onClick={() => navigatePopup('next')}
                        disabled={popup.currentIndex === totalCount - 1}
                        title="Next"
                    >
                        <span className="material-icons-round">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
import React from 'react';
import type { PopupState } from './types';

interface FlashcardContentProps {
    popup: PopupState;
    setPopup: React.Dispatch<React.SetStateAction<PopupState>>;
    artifact: {
        id: number;
        type: string;
        title: string;
        content: string;
    };
}

export default function FlashcardContent({ popup, setPopup, artifact }: FlashcardContentProps) {
    // Parse JSON content
    let card;
    try {
        const content = JSON.parse(artifact.content);
        // Content structure: { artifact_type: "flashcards", cards: [{ front, back, ... }] }
        // Extract the first card from the array
        if (content.cards && content.cards.length > 0) {
            card = content.cards[0];
        } else {
            console.error('Flashcard artifact has no cards:', content);
            return <div>Error loading flashcard: No cards found</div>;
        }
    } catch (error) {
        console.error('Error parsing flashcard content:', error);
        return <div>Error loading flashcard</div>;
    }

    return (
        <div className="flashcard-popup">
            {/* Clickable Flashcard - Simplified */}
            <div className="flashcard-simple-container">
                <div 
                    className="flashcard-simple"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPopup(prev => ({ ...prev, showBack: !prev.showBack }));
                    }}
                >
                    {!popup.showBack ? (
                        // Front Side
                        <div className="flashcard-side front">
                            <div className="flashcard-content">
                                <p>{card.front}</p>
                            </div>
                            {card.hints && card.hints.length > 0 && (
                                <div 
                                    className={`flashcard-hint-expandable ${popup.showHint ? 'expanded' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPopup(prev => ({ ...prev, showHint: !prev.showHint }));
                                    }}
                                >
                                    <div className="hint-pill-header">
                                        <span className="material-icons-round">lightbulb</span>
                                        {popup.showHint ? 'Hide Hint' : 'Hint'}
                                    </div>
                                    {popup.showHint && (
                                        <div className="hint-expanded-content">
                                            {card.hints.map((hint: string, index: number) => (
                                                <p key={index}>{hint}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flashcard-prompt">
                                <span className="material-icons-round">touch_app</span>
                                Click to reveal answer
                            </div>
                        </div>
                    ) : (
                        // Back Side
                        <div className="flashcard-side back">
                            <div className="flashcard-content">
                                <p>{card.back}</p>
                            </div>
                            <div className="flashcard-prompt">
                                <span className="material-icons-round">touch_app</span>
                                Click to show question
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
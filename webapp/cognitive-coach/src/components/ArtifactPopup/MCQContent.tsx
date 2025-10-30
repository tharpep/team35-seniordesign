import React from 'react';
import type { PopupState } from './types';

interface MCQContentProps {
    popup: PopupState;
    setPopup: React.Dispatch<React.SetStateAction<PopupState>>;
    artifact: {
        id: number;
        type: string;
        title: string;
        content: string;
    };
}

export default function MCQContent({ popup, setPopup, artifact }: MCQContentProps) {
    // Parse JSON content
    let question;
    try {
        question = JSON.parse(artifact.content);
    } catch (error) {
        console.error('Error parsing MCQ content:', error);
        return <div>Error loading question</div>;
    }

    const handleAnswerClick = (answerIndex: number) => {
        setPopup(prev => ({ 
            ...prev, 
            selectedAnswer: answerIndex,
            showExplanation: true
        }));
    };

    return (
        <div className="mcq-popup">
            <div className="mcq-question">
                <p>{question.stem}</p>
            </div>

            <div className="mcq-options">
                {question.options.map((option: string, index: number) => (
                    <label key={index} className="mcq-option">
                        <input
                            type="radio"
                            name="mcq-answer"
                            value={index}
                            checked={popup.selectedAnswer === index}
                            onChange={() => handleAnswerClick(index)}
                            disabled={popup.showExplanation}
                        />
                        <span className="option-text">{option}</span>
                    </label>
                ))}
            </div>

            {popup.showExplanation && (
                <div className="mcq-explanation">
                    <div className={`result ${popup.selectedAnswer === question.answer_index ? 'correct' : 'incorrect'}`}>
                        <span className="material-icons-round">
                            {popup.selectedAnswer === question.answer_index ? 'check_circle' : 'cancel'}
                        </span>
                        {popup.selectedAnswer === question.answer_index ? 'Correct!' : 'Incorrect'}
                    </div>
                    <div className="explanation-content">
                        <h4>Explanation</h4>
                        <p>{question.rationale}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
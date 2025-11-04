import { useState } from 'react';
import './CurrentSessionDetails.css';
import FocusAnalytics from '../FocusAnalytics/FocusAnalytics';
import StudyArtifacts from '../StudyArtifacts/StudyArtifacts';

interface CurrentSessionDetailsProps {
    sessionId?: number;
    artifacts?: any[];
    focusScore?: number;
    onArtifactClick?: (artifact: any, index: number) => void;
}

export default function CurrentSessionDetails({ artifacts = [], focusScore = 0, onArtifactClick }: CurrentSessionDetailsProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [chatMessage, setChatMessage] = useState('');

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatMessage.trim()) {
            // TODO: Implement AI chat integration
            console.log('Sending message:', chatMessage);
            setChatMessage('');
        }
    };

    return (
        <div className="current-session-details-section">
            <div 
                className="current-session-details-header" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h2>
                    <span className="material-icons-round section-icon">analytics</span>
                    Current Session Details
                </h2>
                <button 
                    className="icon-button" 
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                    <span className="material-icons-round">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                </button>
            </div>

            {isExpanded && (
                <div className="current-session-details-content">
                    {/* Focus Analytics */}
                    <div className="session-detail-card">
                        <FocusAnalytics focusScore={focusScore} />
                    </div>

                    {/* Study Artifacts */}
                    <div className="session-detail-card">
                        <StudyArtifacts 
                            artifacts={artifacts}
                            onArtifactClick={onArtifactClick || (() => {})}
                        />
                    </div>

                    {/* Ask AI */}
                    <div className="session-detail-card">
                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">smart_toy</span>
                                Ask AI About This Session
                            </h2>
                            <div className="ai-chat-mini">
                                <p className="ai-intro-text">
                                    Ask questions about your current study session, get clarifications, or request practice problems.
                                </p>
                                <form onSubmit={handleSendMessage} className="chat-input-form">
                                    <input
                                        type="text"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="chat-input"
                                    />
                                    <button 
                                        type="submit" 
                                        className="send-button"
                                        disabled={!chatMessage.trim()}
                                    >
                                        <span className="material-icons-round">send</span>
                                    </button>
                                </form>
                                <div className="suggested-questions-mini">
                                    <button 
                                        className="suggestion-btn-mini"
                                        onClick={() => setChatMessage("Explain the key concept")}
                                    >
                                        Explain key concept
                                    </button>
                                    <button 
                                        className="suggestion-btn-mini"
                                        onClick={() => setChatMessage("Create a practice problem")}
                                    >
                                        Practice problem
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

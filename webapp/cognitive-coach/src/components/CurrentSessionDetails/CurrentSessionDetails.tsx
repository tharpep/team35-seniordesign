import { useState, useEffect, useRef } from 'react';
import './CurrentSessionDetails.css';
import FocusAnalytics from '../FocusAnalytics/FocusAnalytics';
import StudyArtifacts from '../StudyArtifacts/StudyArtifacts';
import { genaiApi } from '../../services/genaiApi';
import { api } from '../../services/api';

interface ChatMessage {
    id: string;
    type: 'user' | 'ai';
    text: string;
    timestamp: string;
}

interface CurrentSessionDetailsProps {
    sessionId?: number;
    artifacts?: any[];
    focusScore?: number;
    onArtifactClick?: (artifact: any, index: number) => void;
}

export default function CurrentSessionDetails({ sessionId, artifacts = [], focusScore = 0, onArtifactClick }: CurrentSessionDetailsProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            id: '1',
            type: 'ai',
            text: "Hi! I can help answer questions about your current session. Ask me anything about the topics you're covering!",
            timestamp: 'Just now'
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatHistory, isTyping]);

    // Clear chat session when component unmounts
    useEffect(() => {
        return () => {
            genaiApi.clearChatSession('global').catch(error => {
                console.warn('Failed to clear chat session on unmount:', error);
            });
        };
    }, []);

    const handleGenerateArtifact = async (type: 'flashcard' | 'mcq' | 'insights') => {
        if (!sessionId) {
            console.error('Cannot generate artifact: No session ID found');
            alert('Error: No session ID found. Cannot generate artifact.');
            return;
        }
        
        try {
            await api.generateArtifact(String(sessionId), type);
            // Artifacts will appear automatically via socket events (material-created)
            // No need for success alert - the artifact will show up in the list
        } catch (error: any) {
            console.error('Generate artifact error:', error);
            alert(error.message || 'Failed to generate artifact');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMessage.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            text: chatMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatHistory(prev => [...prev, userMessage]);
        const messageToSend = chatMessage;
        setChatMessage('');
        setIsTyping(true);

        try {
            // Call gen-ai API directly (bypasses backend)
            // Pass sessionId if available, but no full context since we don't have session data here
            const response = await genaiApi.chat(
                messageToSend, 
                sessionId ? String(sessionId) : 'global',
                sessionId ? { session_id: sessionId } : undefined
            );
            
            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: response.answer,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setChatHistory(prev => [...prev, aiResponse]);
        } catch (error: any) {
            console.error('Chat error:', error);
            
            // Show error message to user
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: error.message || 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
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
                            sessionId={sessionId ? String(sessionId) : ''}
                            onGenerate={handleGenerateArtifact}
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
                                <div className="chat-messages-mini" ref={chatMessagesRef}>
                                    {chatHistory.map((message) => (
                                        <div key={message.id} className={`chat-message-mini ${message.type}-message-mini`}>
                                            <div className="message-text-mini">{message.text}</div>
                                            <div className="message-time-mini">{message.timestamp}</div>
                                        </div>
                                    ))}
                                    {isTyping && (
                                        <div className="chat-message-mini ai-message-mini">
                                            <div className="message-text-mini typing-indicator-mini">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <form onSubmit={handleSendMessage} className="chat-input-form">
                                    <input
                                        type="text"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="chat-input"
                                        disabled={isTyping}
                                    />
                                    <button 
                                        type="submit" 
                                        className="send-button"
                                        disabled={!chatMessage.trim() || isTyping}
                                    >
                                        <span className="material-icons-round">send</span>
                                    </button>
                                </form>
                                <div className="suggested-questions-mini">
                                    <button 
                                        className="suggestion-btn-mini"
                                        onClick={() => setChatMessage("Explain the key concept")}
                                        disabled={isTyping}
                                    >
                                        Explain key concept
                                    </button>
                                    <button 
                                        className="suggestion-btn-mini"
                                        onClick={() => setChatMessage("Create a practice problem")}
                                        disabled={isTyping}
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

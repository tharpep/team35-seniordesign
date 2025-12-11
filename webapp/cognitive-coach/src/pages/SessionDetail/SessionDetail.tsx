import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { genaiApi } from '../../services/genaiApi';
import './SessionDetail.css';
import ArtifactPopupController from '../../components/ArtifactPopup/ArtifactPopupController';
import StudyArtifacts from '../../components/StudyArtifacts/StudyArtifacts';
import FocusAnalytics from '../../components/FocusAnalytics/FocusAnalytics';
import type { PopupState } from '../../components/ArtifactPopup/types';
import ProfilePopup from '../../components/ProfilePopup/ProfilePopup';

interface TimelineEvent {
    time: string;
    title: string;
    description: string;
}

interface Insight {
    title: string;
    description: string;
    icon: string;
}

interface ChatMessage {
    id: string;
    type: 'user' | 'ai';
    text: string;
    timestamp: string;
}

interface Artifact {
    id: number;
    type: string;
    title: string;
    content: string;
}

export default function SessionDetail() {
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
    const [userInitials, setUserInitials] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            id: '1',
            type: 'ai',
            text: "Hi! I can help answer questions about your session. Ask me anything about the topics you covered, clarify concepts, or get additional practice problems!",
            timestamp: 'Just now'
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const [popup, setPopup] = useState<PopupState>({
        isOpen: false,
        type: null,
        currentIndex: 0,
        showHint: false,
        showBack: false,
        selectedAnswer: null,
        showExplanation: false
    });

    const [sessionData, setSessionData] = useState<any>(null);
    const [rawSession, setRawSession] = useState<any>(null); // Store raw session data for context
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [artifactCounts, setArtifactCounts] = useState({ flashcard: 0, MCQ: 0, equation: 0, total: 0 });
    const [focusMetrics, setFocusMetrics] = useState<{
        timeSeries: any[];
        peakFocus: number | null;
        lowestFocus: number | null;
    }>({ timeSeries: [], peakFocus: null, lowestFocus: null });

    // Fetch user initials
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await api.getCurrentUser();
                if (user && user.first_name && user.last_name) {
                    const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
                    setUserInitials(initials);
                } else {
                    setUserInitials('?');
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setUserInitials('?');
            }
        };
        fetchUser();
    }, []);

    // Fetch session data and artifacts
    useEffect(() => {
        const fetchData = async () => {
            if (!sessionId) return;

            setIsLoading(true);
            try {
                // Fetch session data, artifacts, and facial metrics in parallel
                const [sessionResponse, artifactsData, metricsResponse] = await Promise.all([
                    api.getSession(sessionId),
                    api.getMaterials(sessionId),
                    api.getSessionMetrics(sessionId)
                ]);

                // Process facial metrics for focus chart
                if (metricsResponse && metricsResponse.timeSeries) {
                    const aggregated = metricsResponse.aggregated || {};
                    setFocusMetrics({
                        timeSeries: metricsResponse.timeSeries,
                        peakFocus: aggregated.max_focus_score ? Math.round(aggregated.max_focus_score * 100) : null,
                        lowestFocus: aggregated.min_focus_score ? Math.round(aggregated.min_focus_score * 100) : null
                    });
                }
                
                // Store raw session data for passing to chat
                if (sessionResponse) {
                    setRawSession(sessionResponse);
                }
                
                setArtifacts(artifactsData || []);
                
                // Calculate artifact counts
                const counts = {
                    flashcard: artifactsData.filter((a: Artifact) => a.type === 'flashcard').length,
                    MCQ: artifactsData.filter((a: Artifact) => a.type === 'multiple_choice').length,
                    equation: artifactsData.filter((a: Artifact) => a.type === 'equation').length,
                    total: artifactsData.length
                };
                setArtifactCounts(counts);

                // Format session data for display
                if (sessionResponse) {
                    // Parse timestamps - handle both ISO format (with Z) and SQLite format
                    const parseTimestamp = (ts: string | null): Date | null => {
                        if (!ts) return null;
                        // If it doesn't have timezone info, treat as local time
                        if (!ts.includes('Z') && !ts.includes('+') && !ts.includes('-', 10)) {
                            return new Date(ts.replace(' ', 'T'));
                        }
                        return new Date(ts);
                    };

                    const startTime = parseTimestamp(sessionResponse.start_time);
                    const endTime = parseTimestamp(sessionResponse.end_time);
                    // Duration is stored in seconds, convert to minutes for display
                    const durationSeconds = sessionResponse.duration || 0;
                    const durationMinutes = Math.floor(durationSeconds / 60);
                    const durationSecs = durationSeconds % 60;
                    const durationStr = durationMinutes > 0
                        ? `${durationMinutes}m ${durationSecs}s`
                        : `${durationSecs}s`;

                    // Format time display consistently
                    const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const formatDate = (date: Date) => date.toLocaleDateString();

                    setSessionData({
                        title: sessionResponse.title || 'Untitled Session',
                        date: startTime && endTime
                            ? `${formatDate(startTime)}, ${formatTime(startTime)} - ${formatTime(endTime)}`
                            : startTime
                                ? `${formatDate(startTime)}, ${formatTime(startTime)}`
                                : 'Unknown date',
                        duration: durationStr,
                        sessionId: '#' + sessionId,
                        status: sessionResponse.status || 'Unknown',
                        metrics: {
                            focusScore: sessionResponse.focus_score || null,
                            emotion: "focused",
                            materials: artifactsData.length,
                            artifacts: artifactsData.length
                        }
                    });
                } else {
                    // Fallback if session not found
                    setSessionData({
                        title: 'Session Not Found',
                        date: 'Unknown',
                        duration: '0m',
                        sessionId: '#' + sessionId,
                        status: 'Unknown',
                        metrics: {
                            focusScore: null,
                            emotion: "unknown",
                            materials: artifactsData.length,
                            artifacts: artifactsData.length
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching session data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [sessionId]);

    const handleProfileClick = () => {
        setIsProfilePopupOpen(true);
    };

    const handleCloseProfilePopup = () => {
        setIsProfilePopupOpen(false);
    };

    const timelineEvents: TimelineEvent[] = [
        { time: '2:30', title: 'Session Started', description: 'All cameras initialized' },
        { time: '2:45', title: 'High Focus Period', description: '95% focus on alkene reactions' },
        { time: '3:20', title: 'Break Detected', description: '5 minute study break' },
        { time: '4:10', title: 'Focus Dip', description: 'Attention decreased to 65%' },
        { time: '4:45', title: 'Session Ended', description: 'Review completed' }
    ];

    // Parse insights from database artifacts
    // Structure: { artifact_type: "insights", insights: [{ title, takeaway, ... }] }
    const insights: Insight[] = artifacts
        .filter(artifact => artifact.type === 'insights')
        .flatMap((artifact, artifactIndex) => {
            try {
                const content = JSON.parse(artifact.content);
                // Extract all insights from the array
                if (content.insights && Array.isArray(content.insights) && content.insights.length > 0) {
                    return content.insights.map((insight: any, insightIndex: number) => ({
                        title: insight.title || artifact.title,
                        description: insight.takeaway || 'No description available',
                        icon: (artifactIndex + insightIndex) === 0 ? 'trending_up' : 
                              (artifactIndex + insightIndex) === 1 ? 'psychology' : 'balance'
                    }));
                } else {
                    // Fallback if structure is unexpected
                    console.warn('Insight artifact has no insights array:', artifact.id);
                    return [{
                        title: artifact.title,
                        description: 'No description available',
                        icon: artifactIndex === 0 ? 'trending_up' : artifactIndex === 1 ? 'psychology' : 'balance'
                    }];
                }
            } catch (error) {
                console.error('Error parsing insight:', error, artifact);
                return [{
                    title: artifact.title,
                    description: 'Error loading insight',
                    icon: 'lightbulb'
                }];
            }
        })
        .slice(0, 3); // Only take first 3 insights total

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatHistory, isTyping]);

    // Clear chat session when component unmounts (chat closes/opens)
    useEffect(() => {
        return () => {
            // Clear chat session when component unmounts
            genaiApi.clearChatSession('global').catch(error => {
                console.warn('Failed to clear chat session on unmount:', error);
            });
        };
    }, []);

    const handleSendMessage = async () => {
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
            // Build session context from raw session data
            const sessionContext = rawSession ? {
                session_id: rawSession.id,
                session_title: rawSession.title,
                session_topic: rawSession.context, // Topic extracted from session context field
                start_time: rawSession.start_time,
                end_time: rawSession.end_time,
                duration: rawSession.duration,
                status: rawSession.status,
                created_at: rawSession.created_at,
                focus_score: rawSession.focus_score
            } : undefined;

            // Call gen-ai API directly (bypasses backend)
            const response = await genaiApi.chat(
                messageToSend, 
                sessionId || 'global',
                sessionContext
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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    const handleArtifactClick = (artifactType: 'flashcard' | 'MCQ' | 'equation', artifactId: number) => {
        // Filter artifacts by type
        const typeMapping: { [key: string]: string } = {
            'flashcard': 'flashcard',
            'MCQ': 'multiple_choice',
            'equation': 'equation'
        };
        
        const filteredArtifacts = artifacts.filter(a => a.type === typeMapping[artifactType]);
        
        // Find the index of the clicked artifact
        const clickedIndex = filteredArtifacts.findIndex(a => a.id === artifactId);
        
        setPopup({
            isOpen: true,
            type: artifactType,
            currentIndex: clickedIndex >= 0 ? clickedIndex : 0,
            showHint: false,
            showBack: false,
            selectedAnswer: null,
            showExplanation: false
        });
    };

    const closePopup = () => {
        setPopup({
            isOpen: false,
            type: null,
            currentIndex: 0,
            showHint: false,
            showBack: false,
            selectedAnswer: null,
            showExplanation: false
        });
    };

    const navigatePopup = (direction: 'next' | 'prev') => {
        if (!popup.type) return;
        
        let maxIndex = 0;
        if (popup.type === 'flashcard') maxIndex = artifactCounts.flashcard - 1;
        else if (popup.type === 'MCQ') maxIndex = artifactCounts.MCQ - 1;
        else if (popup.type === 'equation') maxIndex = artifactCounts.equation - 1;

        const newIndex = direction === 'next' 
            ? Math.min(popup.currentIndex + 1, maxIndex)
            : Math.max(popup.currentIndex - 1, 0);

        setPopup(prev => ({
            ...prev,
            currentIndex: newIndex,
            showHint: false,
            showBack: false,
            selectedAnswer: null,
            showExplanation: false
        }));
    };

    const handleGenerateArtifact = async (type: 'flashcard' | 'mcq' | 'insights') => {
        if (!sessionId) {
            alert('Error: No session ID found. Please navigate to a valid session.');
            return;
        }
        
        try {
            await api.generateArtifact(sessionId, type);
            
            // Refresh artifacts
            const artifactsData = await api.getMaterials(sessionId);
            setArtifacts(artifactsData || []);
            
            // Recalculate counts
            const counts = {
                flashcard: artifactsData.filter(a => a.type === 'flashcard').length,
                MCQ: artifactsData.filter(a => a.type === 'multiple_choice').length,
                equation: artifactsData.filter(a => a.type === 'equation').length,
                total: artifactsData.length
            };
            setArtifactCounts(counts);
        } catch (error: any) {
            console.error('Generate artifact error:', error);
            // Show the actual error message from the API
            alert(error.message || 'Failed to generate artifact');
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Loading session...
            </div>
        );
    }

    if (!sessionData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Session not found
            </div>
        );
    }

    return (
        <>
            <header className="header">
                <div className="header-content">
                    <a href="#" className="logo" onClick={() => navigate('/')}>
                        <div className="logo-icon">
                            <span className="material-icons-round">psychology</span>
                        </div>
                        Study Coach
                    </a>
                    <div className="header-actions">
                        <button className="icon-button" title="Notifications">
                            <span className="material-icons-round">notifications</span>
                        </button>
                        <button className="icon-button" title="Settings">
                            <span className="material-icons-round">settings</span>
                        </button>
                        <button className="user-avatar" title="Profile" onClick={handleProfileClick}>
                            {userInitials || 'JD'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="session-detail-container">
                <div className="session-header card-large">
                    <div className="breadcrumb">
                        <a href="#" onClick={() => navigate('/')}>Dashboard</a>
                        <span className="breadcrumb-separator">
                            <span className="material-icons-round" style={{fontSize: '14px'}}>chevron_right</span>
                        </span>
                        <span>Session Details</span>
                    </div>
                    
                    <div className="session-title-section">
                        <div className="session-title">
                            <h1>{sessionData.title}</h1>
                            <div className="session-meta">
                                <div className="session-meta-item">
                                    <span className="material-icons-round" style={{fontSize: '16px'}}>schedule</span>
                                    {sessionData.date}
                                </div>
                                <div className="session-meta-item">
                                    <span className="material-icons-round" style={{fontSize: '16px'}}>timer</span>
                                    {sessionData.duration}
                                </div>
                                <div className="session-meta-item">
                                    <span className="material-icons-round" style={{fontSize: '16px'}}>tag</span>
                                    Session {sessionData.sessionId}
                                </div>
                            </div>
                        </div>
                        <div className="session-badge">{sessionData.status}</div>
                    </div>

                    <div className="session-overview">
                        <div className="overview-metric focus">
                            <div className="value">{sessionData.metrics.focusScore}%</div>
                            <div className="label">Focus Score</div>
                        </div>
                        <div className="overview-metric emotion">
                            <div className="value">{sessionData.metrics.emotion.charAt(0).toUpperCase() + sessionData.metrics.emotion.slice(1)}</div>
                            <div className="label">Emotion</div>
                        </div>
                        <div className="overview-metric artifacts">
                            <div className="value">{artifactCounts.total}</div>
                            <div className="label">Study Artifacts</div>
                        </div>
                    </div>
                </div>

                <div className="content-grid">
                    <div className="main-content">
                        <FocusAnalytics
                            focusScore={sessionData.metrics.focusScore}
                            peakFocus={focusMetrics.peakFocus}
                            lowestFocus={focusMetrics.lowestFocus}
                            timeSeries={focusMetrics.timeSeries}
                            sessionStartTime={rawSession?.start_time}
                            sessionDuration={rawSession?.duration}
                        />

                        <StudyArtifacts 
                            artifacts={artifacts}
                            onArtifactClick={handleArtifactClick}
                            sessionId={sessionId!}
                            onGenerate={handleGenerateArtifact}
                        />

                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">smart_toy</span>
                                Ask AI About This Session
                            </h2>
                            <div className="ai-chat-container">
                                <div className="chat-messages" ref={chatMessagesRef}>
                                    {chatHistory.map((message) => (
                                        <div key={message.id} className={`${message.type}-message`}>
                                            <div className={`message-avatar ${message.type}-avatar`}>
                                                {message.type === 'ai' ? 'AI' : 'You'}
                                            </div>
                                            <div className="message-content">
                                                <div className="message-text">
                                                    {message.text}
                                                </div>
                                                <div className="message-time">{message.timestamp}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && (
                                        <div className="ai-message">
                                            <div className="message-avatar ai-avatar">AI</div>
                                            <div className="message-content">
                                                <div className="message-text typing-indicator">
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="chat-input-container">
                                    <div className="suggested-questions">
                                        <button className="suggestion-btn" onClick={() => setChatMessage("Explain Markovnikov's rule")}>
                                            Explain Markovnikov's rule
                                        </button>
                                        <button className="suggestion-btn" onClick={() => setChatMessage("Create a practice problem")}>
                                            Create a practice problem
                                        </button>
                                        <button className="suggestion-btn" onClick={() => setChatMessage("What are common mistakes?")}>
                                            What are common mistakes?
                                        </button>
                                    </div>
                                    <div className="chat-input-wrapper">
                                        <input 
                                            type="text" 
                                            className="chat-input" 
                                            placeholder="Ask about alkenes, stereochemistry, reactions..." 
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                        />
                                        <button className="send-btn" onClick={handleSendMessage}>
                                            <span className="material-icons-round">send</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar">
                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">schedule</span>
                                Session Timeline
                            </h2>
                            <div className="timeline">
                                {timelineEvents.map((event, index) => (
                                    <div key={index} className="timeline-item">
                                        <div className="timeline-time">{event.time}</div>
                                        <div className="timeline-content">
                                            <div className="timeline-title">{event.title}</div>
                                            <div className="timeline-desc">{event.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">lightbulb</span>
                                AI Insights
                            </h2>
                            {insights.length > 0 ? (
                                <div className="insights-list">
                                    {insights.map((insight, index) => (
                                        <div key={index} className="insight-item">
                                            <div className="insight-title">
                                                <span className="material-icons-round" style={{fontSize: '14px'}}>
                                                    {insight.icon}
                                                </span>
                                                {insight.title}
                                            </div>
                                            <div className="insight-desc">{insight.description}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
                                    No insights generated for this session yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <ProfilePopup 
                isOpen={isProfilePopupOpen}
                onClose={handleCloseProfilePopup}
            />

            {/* Artifact Popup */}
            {popup.isOpen && (
                <ArtifactPopupController
                    popup={popup}
                    closePopup={closePopup}
                    navigatePopup={navigatePopup}
                    setPopup={setPopup}
                    artifacts={artifacts}
                    totalCount={
                        popup.type === 'flashcard' ? artifactCounts.flashcard :
                        popup.type === 'MCQ' ? artifactCounts.MCQ :
                        popup.type === 'equation' ? artifactCounts.equation :
                        0
                    }
                />
            )}
        </>
    );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './SessionDetail.css';
import mockInsights from '../../assets/data/mockInsights.json';
import ArtifactPopupController from '../../components/ArtifactPopup/ArtifactPopupController';
import StudyArtifacts, { getArtifactCounts } from '../../components/StudyArtifacts/StudyArtifacts';
import FocusAnalytics from '../../components/FocusAnalytics/FocusAnalytics';
import type { PopupState } from '../../components/ArtifactPopup/types';

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

export default function SessionDetail() {
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            id: '1',
            type: 'ai',
            text: "Hi! I can help answer questions about your Organic Chemistry session. Ask me anything about the topics you covered, clarify concepts, or get additional practice problems!",
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

    // Mock data - in real app, this would come from API based on sessionId
    console.log('Session ID:', sessionId); // TODO: Use sessionId to fetch actual data
    const sessionData = {
        title: 'Organic Chemistry Review',
        date: 'Today, 2:30 PM - 4:45 PM',
        duration: '2h 15m',
        sessionId: '#2847',
        status: 'Completed',
        metrics: {
            focusScore: 88,
            emotion: "focused",
            materials: 34,
            artifacts: 15
        }
    };

    const timelineEvents: TimelineEvent[] = [
        { time: '2:30', title: 'Session Started', description: 'All cameras initialized' },
        { time: '2:45', title: 'High Focus Period', description: '95% focus on alkene reactions' },
        { time: '3:20', title: 'Break Detected', description: '5 minute study break' },
        { time: '4:10', title: 'Focus Dip', description: 'Attention decreased to 65%' },
        { time: '4:45', title: 'Session Ended', description: 'Review completed' }
    ];

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatHistory, isTyping]);

    const insights: Insight[] = mockInsights.insights.slice(0, 3).map((insight, index) => ({
        title: insight.title,
        description: insight.takeaway,
        icon: index === 0 ? 'trending_up' : index === 1 ? 'psychology' : 'balance'
    }));

    // Mock AI responses based on keywords
    const getMockAIResponse = (userMessage: string): string => {
        const message = userMessage.toLowerCase();
        
        if (message.includes("markovnikov")) {
            return "Markovnikov's rule states that in the addition of HX to an alkene, the hydrogen atom attaches to the carbon with the greater number of hydrogen atoms, while the halogen attaches to the carbon with fewer hydrogen atoms. This occurs because the reaction proceeds through the more stable carbocation intermediate.";
        } else if (message.includes("practice problem")) {
            return "Here's a practice problem: Draw the major product when 2-methyl-2-butene reacts with HBr. Remember to apply Markovnikov's rule! The answer would be 2-bromo-2-methylbutane, as the Br⁻ adds to the more substituted carbon.";
        } else if (message.includes("common mistakes") || message.includes("mistakes")) {
            return "Common mistakes in alkene reactions include: 1) Forgetting to consider carbocation stability, 2) Not applying Markovnikov's rule correctly, 3) Ignoring stereochemistry in addition reactions, and 4) Confusing syn vs anti addition mechanisms.";
        } else if (message.includes("alkene") || message.includes("alkenes")) {
            return "Alkenes are hydrocarbons with C=C double bonds. Key reactions include: addition reactions (hydrohalogenation, hydration, halogenation), oxidation (ozonolysis, epoxidation), and polymerization. The double bond makes them reactive nucleophiles.";
        } else if (message.includes("stereochemistry")) {
            return "Stereochemistry in alkene reactions is crucial! Syn addition (both groups add to the same face) occurs in catalytic hydrogenation and osmium tetroxide reactions. Anti addition (groups add to opposite faces) occurs in bromine addition and acid-catalyzed hydration.";
        } else if (message.includes("carbocation")) {
            return "Carbocation stability follows the order: tertiary > secondary > primary > methyl. This is due to hyperconjugation and inductive effects from alkyl groups. More stable carbocations form preferentially, explaining Markovnikov's rule.";
        } else if (message.includes("focus") || message.includes("attention")) {
            return "I noticed your focus was highest during the alkene reactions section (around 3:00-3:20). This suggests you learn best when working with specific mechanisms. Try breaking down complex topics into step-by-step mechanisms like you did with those reactions!";
        } else {
            return "That's a great question! Based on your session, you showed strong understanding of reaction mechanisms. Could you be more specific about which aspect of organic chemistry you'd like me to explain? I can help with alkenes, stereochemistry, or any other topics you covered.";
        }
    };

    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            text: chatMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Add user message
        setChatHistory(prev => [...prev, userMessage]);
        setChatMessage('');
        setIsTyping(true);

        // Simulate AI thinking time
        setTimeout(() => {
            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: getMockAIResponse(chatMessage),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setChatHistory(prev => [...prev, aiResponse]);
            setIsTyping(false);
        }, 1500); // 1.5 second delay to simulate AI processing
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    const handleArtifactClick = (artifactType: 'flashcard' | 'MCQ' | 'equation') => {
        setPopup({
            isOpen: true,
            type: artifactType,
            currentIndex: 0,
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
        
        const artifactCounts = getArtifactCounts();
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
                        <div className="user-avatar" title="Profile">JD</div>
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
                            <div className="value">{getArtifactCounts().total}</div>
                            <div className="label">Study Artifacts</div>
                        </div>
                    </div>
                </div>

                <div className="content-grid">
                    <div className="main-content">
                        <FocusAnalytics focusScore={sessionData.metrics.focusScore} />

                        <StudyArtifacts onArtifactClick={handleArtifactClick} />

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
                        </div>
                    </div>
                </div>
            </main>

            {/* Artifact Popup */}
            {popup.isOpen && (
                <ArtifactPopupController
                    popup={popup}
                    closePopup={closePopup}
                    navigatePopup={navigatePopup}
                    setPopup={setPopup}
                    totalCount={
                        popup.type === 'flashcard' ? getArtifactCounts().flashcard :
                        popup.type === 'MCQ' ? getArtifactCounts().MCQ :
                        popup.type === 'equation' ? getArtifactCounts().equation :
                        0
                    }
                />
            )}
        </>
    );
}

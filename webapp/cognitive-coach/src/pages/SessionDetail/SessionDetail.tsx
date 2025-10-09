import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './SessionDetail.css';
import { api } from '../../services/api';
import { subscribeToMaterials, unsubscribeFromMaterials } from '../../services/socket';

interface TimelineEvent {
    time: string;
    title: string;
    description: string;
}

interface Artifact {
    id: string;
    type: 'flashcard' | 'summary' | 'quiz';
    title: string;
    preview: string;
}

interface Insight {
    title: string;
    description: string;
    icon: string;
}

export default function SessionDetail() {
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const [activeTab, setActiveTab] = useState('focus');
    const [activeArtifactTab, setActiveArtifactTab] = useState('all');
    const [chatMessage, setChatMessage] = useState('');
    
    // New state for fetched materials
    const [materials, setMaterials] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userInitials, setUserInitials] = useState('');

    // Fetch current user and generate initials
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await api.getCurrentUser();
                if (user) {
                    // Generate initials from first_name and last_name
                    const initials = (
                        (user.first_name?.charAt(0) || '') + 
                        (user.last_name?.charAt(0) || '')
                    ).toUpperCase() || user.email.substring(0, 2).toUpperCase();
                    
                    setUserInitials(initials);
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setUserInitials('U');
            }
        };

        fetchUser();
    }, []);

    // Fetch materials on mount and subscribe to real-time updates
    useEffect(() => {
        if (!sessionId) return;

        const fetchMaterials = async () => {
            try {
                setIsLoading(true);
                const data = await api.getMaterials(sessionId);
                setMaterials(data);
                console.log(`Fetched ${data.length} materials for session ${sessionId}`);
            } catch (error) {
                console.error('Error fetching materials:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMaterials();

        // Subscribe to real-time material updates
        subscribeToMaterials(sessionId, (newMaterial: any) => {
            console.log('Received new material via WebSocket:', newMaterial);
            setMaterials(prev => [...prev, newMaterial]);
        });

        // Cleanup on unmount
        return () => {
            unsubscribeFromMaterials(sessionId);
        };
    }, [sessionId]);

    // Mock data - in real app, this would come from API based on sessionId
    const sessionData = {
        title: 'Organic Chemistry Review',
        date: 'Today, 2:30 PM - 4:45 PM',
        duration: '2h 15m',
        sessionId: `#${sessionId}`,
        status: 'Completed',
        metrics: {
            focusScore: 88,
            attention: 78,
            materials: materials.length,
            artifacts: materials.length
        }
    };

    const timelineEvents: TimelineEvent[] = [
        { time: '2:30', title: 'Session Started', description: 'All cameras initialized' },
        { time: '2:45', title: 'High Focus Period', description: '95% focus on alkene reactions' },
        { time: '3:20', title: 'Break Detected', description: '5 minute study break' },
        { time: '4:10', title: 'Focus Dip', description: 'Attention decreased to 65%' },
        { time: '4:45', title: 'Session Ended', description: 'Review completed' }
    ];

    const artifacts: Artifact[] = [
        {
            id: '1',
            type: 'flashcard',
            title: 'Alkene Reactions',
            preview: 'Q: What is the major product of hydrobromination of 2-methylpropene?\nA: 2-bromo-2-methylpropane (Markovnikov addition)'
        },
        {
            id: '2',
            type: 'summary',
            title: 'Stereochemistry Principles',
            preview: 'Covers chirality, optical activity, and R/S nomenclature. Key concepts include...'
        },
        {
            id: '3',
            type: 'flashcard',
            title: 'Elimination vs Substitution',
            preview: 'Q: When does E2 elimination occur preferentially over SN2?\nA: With bulky bases and secondary/tertiary substrates'
        },
        {
            id: '4',
            type: 'summary',
            title: 'Reaction Mechanisms',
            preview: 'Overview of SN1, SN2, E1, and E2 mechanisms with examples and conditions...'
        }
    ];

    const insights: Insight[] = [
        {
            title: 'Strong Performance',
            description: 'Your focus was consistently high during reaction mechanism practice. Consider similar deep-focus sessions for complex topics.',
            icon: 'trending_up'
        },
        {
            title: 'Attention Pattern',
            description: 'Attention decreased after 90 minutes. Consider taking shorter, more frequent breaks.',
            icon: 'psychology'
        },
        {
            title: 'Material Coverage',
            description: 'You spent 60% of time on new material and 40% reviewing. Good balance for retention.',
            icon: 'balance'
        }
    ];

    const handleSendMessage = () => {
        if (chatMessage.trim()) {
            console.log('Sending message:', chatMessage);
            setChatMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    const filteredArtifacts = activeArtifactTab === 'all' 
        ? artifacts 
        : artifacts.filter(artifact => artifact.type === activeArtifactTab);

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
                        <div className="user-avatar" title="Profile">
                            {userInitials || '...'}
                        </div>
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
                        <div className="overview-metric attention">
                            <div className="value">{sessionData.metrics.attention}%</div>
                            <div className="label">Attention</div>
                        </div>
                        <div className="overview-metric materials">
                            <div className="value">{sessionData.metrics.materials}</div>
                            <div className="label">Materials Captured</div>
                        </div>
                        <div className="overview-metric artifacts">
                            <div className="value">{sessionData.metrics.artifacts}</div>
                            <div className="label">Study Artifacts</div>
                        </div>
                    </div>
                </div>

                <div className="content-grid">
                    <div className="main-content">
                        {/* NEW SECTION: Display Raw Materials from Database */}
                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">storage</span>
                                Generated Materials from Database (Raw Data)
                            </h2>
                            
                            {isLoading ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#5f6368' }}>
                                    Loading materials...
                                </div>
                            ) : materials.length === 0 ? (
                                <div style={{ 
                                    padding: '20px', 
                                    textAlign: 'center', 
                                    color: '#5f6368',
                                    background: '#f8f9fa',
                                    borderRadius: '8px'
                                }}>
                                    No materials generated yet. Materials will appear here in real-time when generated.
                                </div>
                            ) : (
                                <div style={{
                                    background: '#f8f9fa',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e8eaed',
                                    maxHeight: '500px',
                                    overflow: 'auto'
                                }}>
                                    <div style={{ 
                                        marginBottom: '12px', 
                                        color: '#34a853',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span className="material-icons-round" style={{fontSize: '16px'}}>check_circle</span>
                                        {materials.length} material(s) loaded from database
                                    </div>
                                    <pre style={{
                                        margin: 0,
                                        padding: '12px',
                                        background: '#ffffff',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        lineHeight: '1.5',
                                        overflow: 'auto',
                                        border: '1px solid #dadce0'
                                    }}>
                                        {JSON.stringify(materials, null, 2)}
                                    </pre>
                                </div>
                            )}
                            
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: '#e8f0fe',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#1a73e8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span className="material-icons-round" style={{fontSize: '16px'}}>info</span>
                                <span>
                                    This displays raw data from the database. WebSocket is listening for new materials in real-time.
                                    New materials will automatically appear here when added to the database.
                                </span>
                            </div>
                        </div>

                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">analytics</span>
                                Focus & Attention Analytics
                            </h2>
                            <div className="tabs">
                                <button 
                                    className={`tab ${activeTab === 'focus' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('focus')}
                                >
                                    Focus Over Time
                                </button>
                                <button 
                                    className={`tab ${activeTab === 'attention' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('attention')}
                                >
                                    Attention Heatmap
                                </button>
                                <button 
                                    className={`tab ${activeTab === 'distractions' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('distractions')}
                                >
                                    Distraction Events
                                </button>
                            </div>
                            <div className="focus-chart">
                                Interactive focus chart would be rendered here<br/>
                                Focus score ranged from 65% to 95% throughout the session
                            </div>
                        </div>

                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">auto_awesome</span>
                                Study Artifacts (Mock UI)
                            </h2>
                            <div className="tabs">
                                <button 
                                    className={`tab ${activeArtifactTab === 'all' ? 'active' : ''}`}
                                    onClick={() => setActiveArtifactTab('all')}
                                >
                                    All Artifacts
                                </button>
                                <button 
                                    className={`tab ${activeArtifactTab === 'flashcard' ? 'active' : ''}`}
                                    onClick={() => setActiveArtifactTab('flashcard')}
                                >
                                    Flashcards ({artifacts.filter(a => a.type === 'flashcard').length})
                                </button>
                                <button 
                                    className={`tab ${activeArtifactTab === 'summary' ? 'active' : ''}`}
                                    onClick={() => setActiveArtifactTab('summary')}
                                >
                                    Summaries ({artifacts.filter(a => a.type === 'summary').length})
                                </button>
                                <button 
                                    className={`tab ${activeArtifactTab === 'quiz' ? 'active' : ''}`}
                                    onClick={() => setActiveArtifactTab('quiz')}
                                >
                                    Quizzes (0)
                                </button>
                            </div>
                            <div className="artifact-grid">
                                {filteredArtifacts.map((artifact) => (
                                    <div key={artifact.id} className="artifact-card">
                                        <div className={`artifact-type ${artifact.type}`}>
                                            {artifact.type.charAt(0).toUpperCase() + artifact.type.slice(1)}
                                        </div>
                                        <div className="artifact-title">{artifact.title}</div>
                                        <div className="artifact-preview">{artifact.preview}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="section card">
                            <h2>
                                <span className="material-icons-round section-icon">smart_toy</span>
                                Ask AI About This Session
                            </h2>
                            <div className="ai-chat-container">
                                <div className="chat-messages">
                                    <div className="ai-message">
                                        <div className="message-avatar ai-avatar">AI</div>
                                        <div className="message-content">
                                            <div className="message-text">
                                                Hi! I can help answer questions about your Organic Chemistry session. Ask me anything about the topics you covered, clarify concepts, or get additional practice problems!
                                            </div>
                                            <div className="message-time">Just now</div>
                                        </div>
                                    </div>
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
        </>
    );
}
import { useState, useCallback, useEffect } from 'react';
import { api } from '../../services/api';
import './Dashboard.css';
import ConfigurePopup from '../../components/ConfigurePopup/ConfigurePopup';
import CurrentSession from '../../components/CurrentSession/CurrentSession';
import ProfilePopup from '../../components/ProfilePopup/ProfilePopup';

interface Session {
    id: number;
    title: string;
    start_time?: string;
    end_time?: string;
    duration: number;
    focusScore: number;
    focus_score?: number;
    status: string;
    artifact_counts?: {
        flashcard: number;
        equation: number;
        multiple_choice: number;
        insights: number;
    };
    total_artifacts?: number;
}

export default function Dashboard() {
    const [isConfigurePopupOpen, setIsConfigurePopupOpen] = useState(false);
    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
    const [sessionSettings, setSessionSettings] = useState({ photoInterval: 2 });
    const [userInitials, setUserInitials] = useState('');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);

    // Fetch user data on component mount
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

    // Fetch sessions on component mount
    useEffect(() => {
        const fetchSessions = async () => {
            setIsLoadingSessions(true);
            try {
                const sessionsData = await api.getSessions();
                setSessions(sessionsData || []);
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setSessions([]);
            } finally {
                setIsLoadingSessions(false);
            }
        };
        fetchSessions();
    }, []);

    const handleSessionClick = (sessionId: number) => {
        window.open(`/session/${sessionId}`, '_blank');
    };

    const handleConfigureClick = () => {
        setIsConfigurePopupOpen(true);
    };

    const handleCloseConfigurePopup = () => {
        setIsConfigurePopupOpen(false);
    };

    const handleProfileClick = () => {
        setIsProfilePopupOpen(true);
    };

    const handleCloseProfilePopup = () => {
        setIsProfilePopupOpen(false);
    };

    const handleSettingsChange = useCallback((settings: { photoInterval: number }) => {
        setSessionSettings(settings);
    }, []);

    // Format duration from seconds to readable format
    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    // Format date from ISO string
    const formatDate = (isoString: string): string => {
        const date = new Date(isoString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    // Render artifact chips for a session
    const renderArtifactChips = (session: Session) => {
        const counts = session.artifact_counts;
        if (!counts || session.total_artifacts === 0) {
            return (
                <div className="artifact-chip">
                    <span className="material-icons-round" style={{fontSize: '12px'}}>auto_awesome</span>
                    No artifacts yet
                </div>
            );
        }

        const chips = [];
        
        if (counts.equation > 0) {
            chips.push(
                <div key="equations" className="artifact-chip equation">
                    <span className="material-icons-round" style={{fontSize: '12px'}}>functions</span>
                    {counts.equation} {counts.equation === 1 ? 'equation' : 'equations'}
                </div>
            );
        }
        
        if (counts.flashcard > 0) {
            chips.push(
                <div key="flashcards" className="artifact-chip flashcard">
                    <span className="material-icons-round" style={{fontSize: '12px'}}>quiz</span>
                    {counts.flashcard} {counts.flashcard === 1 ? 'flashcard' : 'flashcards'}
                </div>
            );
        }
        
        if (counts.multiple_choice > 0) {
            chips.push(
                <div key="mcq" className="artifact-chip question">
                    <span className="material-icons-round" style={{fontSize: '12px'}}>help</span>
                    {counts.multiple_choice} {counts.multiple_choice === 1 ? 'question' : 'questions'}
                </div>
            );
        }

        return chips;
    };

    return (
        <>
            <header className="header">
                <div className="header-content">
                    <a href="#" className="logo">
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

            <main className="dashboard-container">
                {/* Current Session Section */}
                <CurrentSession 
                    onConfigureClick={handleConfigureClick} 
                    sessionSettings={sessionSettings}
                />

                {/* Previous Sessions Section */}
                <div className="sessions-header">
                    <h2>Previous sessions</h2>
                </div>
                
                {isLoadingSessions ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        Loading sessions...
                    </div>
                ) : sessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No sessions found. Start your first study session!
                    </div>
                ) : (
                    <div className="sessions-list">
                        {sessions.map((session) => (
                            <div 
                                key={session.id} 
                                className="session-card"
                                onClick={() => handleSessionClick(session.id)}
                            >
                                <div className="session-card-header">
                                    <div className="session-info">
                                        <h3>{session.title}</h3>
                                        <div className="session-date">
                                            {session.start_time ? formatDate(session.start_time) : 'No date'}
                                        </div>
                                    </div>
                                    <div className="session-duration">
                                        {formatDuration(session.duration)}
                                    </div>
                                </div>

                                <div className="session-metrics">
                                    <div className="session-focus-score">
                                        <span className="focus-score">
                                            Focus: {session.focusScore || session.focus_score || 0}%
                                        </span>
                                        <span className="emotion-label" style={{fontSize: '18px', fontWeight: '500', color: '#3b82f6', marginLeft: '16px'}}>
                                            Status: {session.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="session-artifacts">
                                    {renderArtifactChips(session)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            
            <ConfigurePopup 
                isOpen={isConfigurePopupOpen}
                onClose={handleCloseConfigurePopup}
                onSettingsChange={handleSettingsChange}
            />
            
            <ProfilePopup 
                isOpen={isProfilePopupOpen}
                onClose={handleCloseProfilePopup}
            />
        </>
    );
}

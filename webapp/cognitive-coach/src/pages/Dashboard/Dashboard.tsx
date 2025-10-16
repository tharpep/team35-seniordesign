import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import ConfigurePopup from '../../components/ConfigurePopup/ConfigurePopup';
import CurrentSession from '../../components/CurrentSession/CurrentSession';
import ProfilePopup from '../../components/ProfilePopup/ProfilePopup';

interface Session {
    id: string;
    title: string;
    date: string;
    duration: string;
    focusScore: number;
    materials: number;
    attention: number;
    emotion: string;
    artifacts: {
        equations?: number;
        flashcards?: number;
        questions?: number;
    };
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [isConfigurePopupOpen, setIsConfigurePopupOpen] = useState(false);
    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
    const [sessionSettings, setSessionSettings] = useState({ photoInterval: 2 });

    const sessions: Session[] = [
        {
            id: '1',
            title: 'Organic Chemistry Review',
            date: 'Today, 2:30 PM',
            duration: '2h 15m',
            focusScore: 88,
            materials: 34,
            attention: 78,
            emotion: 'Focused',
            artifacts: { equations: 12, flashcards: 15, questions: 3 }
        },
        {
            id: '2',
            title: 'Calculus Problem Solving',
            date: 'Yesterday, 7:45 PM',
            duration: '1h 45m',
            focusScore: 92,
            materials: 28,
            attention: 89,
            emotion: 'Confident',
            artifacts: { equations: 18, flashcards: 15, questions: 2 }
        },
        {
            id: '3',
            title: 'World History Reading',
            date: '2 days ago, 3:15 PM',
            duration: '3h 20m',
            focusScore: 76,
            materials: 45,
            attention: 72,
            emotion: 'Calm',
            artifacts: { flashcards: 18, questions: 5 }
        },
        {
            id: '4',
            title: 'Physics Lab Analysis',
            date: '3 days ago, 1:00 PM',
            duration: '2h 50m',
            focusScore: 94,
            materials: 31,
            attention: 91,
            emotion: 'Engaged',
            artifacts: { equations: 8, flashcards: 9, questions: 4 }
        }
    ];

    const handleSessionClick = () => {
        navigate(`/session`);
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

    const renderArtifacts = (artifacts: Session['artifacts']) => {
        const items = [];
        if (artifacts.equations) {
            items.push(
                <div key="equations" className="artifact-chip equation">
                    <span className="material-icons-round" style={{fontSize: '12px'}}>functions</span>
                    {artifacts.equations} equations
                </div>
            );
        }
        if (artifacts.flashcards) {
            items.push(
                <div key="flashcards" className="artifact-chip flashcard">
                    <span className="material-icons-round" style={{fontSize: '12px'}}>quiz</span>
                    {artifacts.flashcards} flashcards
                </div>
            );
        }
        if (artifacts.questions) {
            items.push(
                <div key="questions" className="artifact-chip question">
                    <span className="material-icons-round" style={{fontSize: '12px'}}>help</span>
                    {artifacts.questions} questions
                </div>
            );
        }
        return items;
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
                        <button className="user-avatar" title="Profile" onClick={handleProfileClick}>JD</button>
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
                <div className="sessions-list">
                    {sessions.map((session) => (
                        <div 
                            key={session.id} 
                            className="session-card"
                            onClick={handleSessionClick}
                        >
                            <div className="session-card-header">
                                <div className="session-info">
                                    <h3>{session.title}</h3>
                                    <div className="session-date">{session.date}</div>
                                </div>
                                <div className="session-duration">{session.duration}</div>
                            </div>

                            <div className="session-metrics">
                                <div className="session-focus-score">
                                    <span className="focus-score">Focus: {session.focusScore}%</span>
                                    <span className="emotion-label" style={{fontSize: '18px', fontWeight: '500', color: '#3b82f6', marginLeft: '16px'}}>Emotion: {session.emotion}</span>
                                </div>
                            </div>

                            <div className="session-artifacts">
                                {renderArtifacts(session.artifacts)}
                            </div>
                        </div>
                    ))}
                </div>
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

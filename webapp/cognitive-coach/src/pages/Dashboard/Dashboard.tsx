import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import ConfigurePopup from '../../components/ConfigurePopup/ConfigurePopup';
import CurrentSession from '../../components/CurrentSession/CurrentSession';
import { api } from '../../services/api';

interface Session {
    id: string;
    title: string;
    date: string;
    duration: string;
    focusScore: number;
    materials: number;
    attention: number;
    artifacts: {
        equations?: number;
        flashcards?: number;
        questions?: number;
    };
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [isConfigurePopupOpen, setIsConfigurePopupOpen] = useState(false);
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
                // Fallback to default if user fetch fails
                setUserInitials('U');
            }
        };

        fetchUser();
    }, []);

    const sessions: Session[] = [
        {
            id: '1',
            title: 'Organic Chemistry Review',
            date: 'Today, 2:30 PM',
            duration: '2h 15m',
            focusScore: 88,
            materials: 34,
            attention: 78,
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
            artifacts: { equations: 8, flashcards: 9, questions: 4 }
        }
    ];

    const handleSessionClick = (sessionId: string) => {
        navigate(`/session/${sessionId}`);
    };

    const handleConfigureClick = () => {
        setIsConfigurePopupOpen(true);
    };

    const handleCloseConfigurePopup = () => {
        setIsConfigurePopupOpen(false);
    };

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
                        <div className="user-avatar" title="Profile">
                            {userInitials || '...'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard-container">
                <CurrentSession onConfigureClick={handleConfigureClick} />

                <div className="sessions-header">
                    <h2>Previous sessions</h2>
                </div>
                <div className="sessions-list">
                    {sessions.map((session) => (
                        <div 
                            key={session.id} 
                            className="session-card"
                            onClick={() => handleSessionClick(session.id)}
                            style={{ cursor: 'pointer' }}
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
                                    <span className="focus-score">{session.focusScore}%</span>
                                    <div className="focus-bar">
                                        <div 
                                            className="focus-fill" 
                                            style={{width: `${session.focusScore}%`}}
                                        ></div>
                                    </div>
                                </div>
                                <div className="session-metrics-chips">
                                    <div className="session-metric-chip">
                                        {session.materials} materials
                                    </div>
                                    <div className="session-metric-chip">
                                        {session.attention}% attention
                                    </div>
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
            />
        </>
    );
}
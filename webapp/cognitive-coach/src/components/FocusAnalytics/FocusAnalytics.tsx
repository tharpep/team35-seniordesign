import { useState } from 'react';
import FocusChart from '../FocusChart/FocusChart';
import DistractionTimeline from '../DistractionTimeline/DistractionTimeline';

interface FocusAnalyticsProps {
    focusScore: number;
}

export default function FocusAnalytics({ focusScore }: FocusAnalyticsProps) {
    const [activeTab, setActiveTab] = useState('focus');

    return (
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
                    className={`tab ${activeTab === 'distractions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('distractions')}
                >
                    Distraction Events
                </button>
            </div>
            <div className="focus-chart">
                {activeTab === 'focus' ? (
                    <FocusChart 
                        averageFocus={focusScore}
                    />
                ) : (
                    <DistractionTimeline 
                        startTime="2:30 PM"
                        sessionDuration={135} // 2h 15m = 135 minutes
                    />
                )}
            </div>
        </div>
    );
}
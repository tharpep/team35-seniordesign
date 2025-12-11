import { useState } from 'react';
import FocusChart from '../FocusChart/FocusChart';
import DistractionTimeline from '../DistractionTimeline/DistractionTimeline';
import EmotionTimeline from '../EmotionTimeline/EmotionTimeline';

interface FocusDataPoint {
    timestamp: string;
    focusScore: number | null;
    faceDetected: boolean;
    emotion: string | null;
}

interface EmotionEvent {
    time: string;
    emotion: string;
    timestamp: string;
    confidence?: number;
}

interface DistractionEventData {
    id: number;
    timestamp: string;
    distraction_type: string;
    focus_score: number;
    gaze_deviation: number;
}

interface FocusAnalyticsProps {
    focusScore: number | null;
    peakFocus?: number | null;
    lowestFocus?: number | null;
    timeSeries?: FocusDataPoint[];
    sessionStartTime?: string;
    sessionDuration?: number; // in minutes
    distractionEvents?: DistractionEventData[];
}

export default function FocusAnalytics({
    focusScore,
    peakFocus,
    lowestFocus,
    timeSeries,
    sessionStartTime,
    sessionDuration,
    distractionEvents = []
}: FocusAnalyticsProps) {
    const [activeTab, setActiveTab] = useState('focus');

    // Format start time for distraction timeline
    const formatStartTime = (isoString?: string) => {
        if (!isoString) return '12:00 PM';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    // Extract emotion events from time series data
    const emotionEvents: EmotionEvent[] = (timeSeries || [])
        .filter(point => point.emotion !== null)
        .map(point => ({
            time: new Date(point.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            emotion: point.emotion as string,
            timestamp: point.timestamp
        }));

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
                    className={`tab ${activeTab === 'emotions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('emotions')}
                >
                    Emotions
                </button>
                <button
                    className={`tab ${activeTab === 'distractions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('distractions')}
                >
                    Distraction Events
                </button>
            </div>
            <div className="focus-chart">
                {activeTab === 'focus' && (
                    <FocusChart
                        averageFocus={focusScore}
                        peakFocus={peakFocus}
                        lowestFocus={lowestFocus}
                        timeSeries={timeSeries}
                    />
                )}
                {activeTab === 'emotions' && (
                    <EmotionTimeline
                        emotions={emotionEvents}
                        sessionStartTime={sessionStartTime}
                        sessionDuration={sessionDuration}
                    />
                )}
                {activeTab === 'distractions' && (
                    <DistractionTimeline
                        startTime={formatStartTime(sessionStartTime)}
                        sessionDuration={sessionDuration || 60}
                        distractionEvents={distractionEvents}
                        sessionStartTime={sessionStartTime}
                    />
                )}
            </div>
        </div>
    );
}
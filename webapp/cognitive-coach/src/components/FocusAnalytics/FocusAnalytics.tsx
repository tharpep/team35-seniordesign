import { useState } from 'react';
import FocusChart from '../FocusChart/FocusChart';
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

interface FocusAnalyticsProps {
    focusScore: number | null;
    peakFocus?: number | null;
    lowestFocus?: number | null;
    timeSeries?: FocusDataPoint[];
    sessionStartTime?: string;
    sessionDuration?: number; // in minutes
}

export default function FocusAnalytics({
    focusScore,
    peakFocus,
    lowestFocus,
    timeSeries,
    sessionStartTime,
    sessionDuration
}: FocusAnalyticsProps) {
    const [activeTab, setActiveTab] = useState('focus');

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
            </div>
        </div>
    );
}
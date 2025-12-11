import { useState } from 'react';
import './EmotionTimeline.css';

interface EmotionEvent {
    time: string;
    emotion: string;
    timestamp: string; // ISO timestamp from database
    confidence?: number;
}

interface EmotionTimelineProps {
    emotions: EmotionEvent[];
    sessionStartTime?: string;
    sessionDuration?: number; // in minutes
}

// Emotion configuration with icons and colors (matching FER model output)
const emotionConfig: Record<string, { icon: string; color: string; label: string }> = {
    // FER model emotions
    happy: { icon: 'sentiment_very_satisfied', color: '#4CAF50', label: 'Happy' },
    sad: { icon: 'sentiment_very_dissatisfied', color: '#2196F3', label: 'Sad' },
    angry: { icon: 'mood_bad', color: '#f44336', label: 'Angry' },
    surprise: { icon: 'sentiment_satisfied_alt', color: '#FF9800', label: 'Surprise' },
    fear: { icon: 'sentiment_dissatisfied', color: '#9C27B0', label: 'Fear' },
    disgust: { icon: 'sick', color: '#795548', label: 'Disgust' },
    neutral: { icon: 'sentiment_neutral', color: '#607D8B', label: 'Neutral' },
    // Additional mapped emotions
    stressed: { icon: 'psychology_alt', color: '#E91E63', label: 'Stressed' },
    fatigued: { icon: 'bedtime', color: '#673AB7', label: 'Fatigued' },
    // Legacy emotion names (for backwards compatibility)
    surprised: { icon: 'sentiment_satisfied_alt', color: '#FF9800', label: 'Surprised' },
    fearful: { icon: 'sentiment_dissatisfied', color: '#9C27B0', label: 'Fearful' },
    disgusted: { icon: 'sick', color: '#795548', label: 'Disgusted' },
};

export default function EmotionTimeline({ emotions, sessionStartTime, sessionDuration }: EmotionTimelineProps) {
    const [hoveredEvent, setHoveredEvent] = useState<EmotionEvent | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Calculate timeline bounds dynamically based on actual emotion data
    const calculateSessionBounds = () => {
        if (emotions.length === 0) {
            return { startMs: Date.now(), durationMs: 60 * 60 * 1000 }; // Default 1 hour
        }

        const timestamps = emotions.map(e => new Date(e.timestamp).getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);

        // Calculate the actual data range
        const dataRange = maxTime - minTime;

        // Add 10% padding on each side, with minimum padding of 30 seconds
        const padding = Math.max(dataRange * 0.1, 30 * 1000);

        const startMs = minTime - padding;
        const endMs = maxTime + padding;
        const durationMs = Math.max(endMs - startMs, 60 * 1000); // Minimum 1 minute

        return { startMs, durationMs };
    };

    const { startMs, durationMs } = calculateSessionBounds();

    // Calculate position of an event on the timeline (0-100%)
    const getEventPosition = (timestamp: string) => {
        const eventMs = new Date(timestamp).getTime();
        const position = ((eventMs - startMs) / durationMs) * 100;
        return Math.max(0, Math.min(100, position));
    };

    // Display every alternate emotion to reduce clutter
    const getDisplayEvents = () => {
        if (emotions.length === 0) return [];

        const sortedEmotions = [...emotions].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Skip every other frame
        return sortedEmotions
            .filter((_, index) => index % 2 === 0)
            .map((event) => ({
                ...event,
                displayPosition: getEventPosition(event.timestamp),
                verticalOffset: 0
            }));
    };

    const displayEvents = getDisplayEvents();

    // Generate time markers for the timeline - dynamically adjust interval based on duration
    const generateTimeMarkers = () => {
        const markers = [];

        // Choose appropriate interval based on duration
        let markerInterval: number;
        let showSeconds = false;

        const durationMinutes = durationMs / (60 * 1000);

        if (durationMinutes <= 2) {
            markerInterval = 30 * 1000; // Every 30 seconds
            showSeconds = true;
        } else if (durationMinutes <= 5) {
            markerInterval = 60 * 1000; // Every 1 minute
        } else if (durationMinutes <= 15) {
            markerInterval = 2 * 60 * 1000; // Every 2 minutes
        } else if (durationMinutes <= 30) {
            markerInterval = 5 * 60 * 1000; // Every 5 minutes
        } else if (durationMinutes <= 60) {
            markerInterval = 10 * 60 * 1000; // Every 10 minutes
        } else {
            markerInterval = 30 * 60 * 1000; // Every 30 minutes
        }

        // Generate markers
        const firstMarkerMs = Math.ceil(startMs / markerInterval) * markerInterval;

        for (let markerMs = firstMarkerMs; markerMs <= startMs + durationMs; markerMs += markerInterval) {
            const date = new Date(markerMs);
            const timeString = showSeconds
                ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
                : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const position = ((markerMs - startMs) / durationMs) * 100;

            if (position >= 0 && position <= 100) {
                markers.push({ time: timeString, position });
            }
        }

        // Ensure we have at least start and end markers
        if (markers.length < 2) {
            const startDate = new Date(startMs);
            const endDate = new Date(startMs + durationMs);
            const format = showSeconds
                ? { hour: 'numeric' as const, minute: '2-digit' as const, second: '2-digit' as const }
                : { hour: 'numeric' as const, minute: '2-digit' as const };

            return [
                { time: startDate.toLocaleTimeString([], format), position: 0 },
                { time: endDate.toLocaleTimeString([], format), position: 100 }
            ];
        }

        return markers;
    };

    const timeMarkers = generateTimeMarkers();

    // Get unique emotions for legend (only emotions present in the data)
    const uniqueEmotions = [...new Set(emotions.map(e => e.emotion.toLowerCase()))];

    const getEmotionConfig = (emotion: string) => {
        const key = emotion.toLowerCase();
        return emotionConfig[key] || { icon: 'mood', color: '#9E9E9E', label: emotion };
    };

    // Count emotions for summary
    const emotionCounts = emotions.reduce((acc, e) => {
        const key = e.emotion.toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Get dominant emotion
    const dominantEmotion = Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)[0];

    const handleEventHover = (event: EmotionEvent, e: React.MouseEvent) => {
        setHoveredEvent(event);
        setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleEventLeave = () => {
        setHoveredEvent(null);
    };

    // Show empty state if no emotions
    if (emotions.length === 0) {
        return (
            <div className="emotion-timeline-container">
                <div className="emotion-empty-state">
                    <span className="material-icons-round" style={{ fontSize: '48px', color: '#ccc', marginBottom: '8px' }}>
                        mood
                    </span>
                    <p>No emotion data recorded for this session</p>
                    <p style={{ fontSize: '12px', opacity: 0.7 }}>
                        Enable webcam during your session to track emotions
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="emotion-timeline-container">
            <div className="timeline-legend">
                {uniqueEmotions.slice(0, 5).map(emotion => {
                    const config = getEmotionConfig(emotion);
                    return (
                        <div key={emotion} className="legend-item">
                            <span
                                className="material-icons-round legend-icon"
                                style={{ color: config.color }}
                            >
                                {config.icon}
                            </span>
                            <span>{config.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="timeline-wrapper">
                {/* Timeline axis */}
                <div className="timeline-axis">
                    <div className="timeline-line"></div>

                    {/* Time markers */}
                    {timeMarkers.map((marker, index) => (
                        <div
                            key={index}
                            className="time-marker"
                            style={{ left: `${marker.position}%` }}
                        >
                            <div className="marker-tick"></div>
                            <div className="marker-label">{marker.time}</div>
                        </div>
                    ))}

                    {/* Emotion events */}
                    {displayEvents.map((event, index) => {
                        const config = getEmotionConfig(event.emotion);
                        return (
                            <div
                                key={index}
                                className="emotion-event"
                                style={{
                                    left: `${event.displayPosition}%`,
                                    color: config.color,
                                    borderColor: config.color,
                                }}
                                onMouseEnter={(e) => handleEventHover(event, e)}
                                onMouseLeave={handleEventLeave}
                                onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                            >
                                <span className="material-icons-round event-icon">
                                    {config.icon}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tooltip */}
            {hoveredEvent && (
                <div
                    className="timeline-tooltip"
                    style={{
                        left: mousePosition.x - 100,
                        top: mousePosition.y - 70,
                        position: 'fixed',
                        pointerEvents: 'none'
                    }}
                >
                    <div className="tooltip-time">
                        {new Date(hoveredEvent.timestamp).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </div>
                    <div className="tooltip-emotion">
                        {getEmotionConfig(hoveredEvent.emotion).label}
                    </div>
                    {hoveredEvent.confidence && (
                        <div className="tooltip-confidence">
                            Confidence: {Math.round(hoveredEvent.confidence * 100)}%
                        </div>
                    )}
                </div>
            )}

            <div className="timeline-summary">
                <div className="summary-stat">
                    <span className="stat-value">{emotions.length}</span>
                    <span className="stat-label">Total Records</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{uniqueEmotions.length}</span>
                    <span className="stat-label">Unique Emotions</span>
                </div>
                {dominantEmotion && (
                    <div className="summary-stat dominant">
                        <span
                            className="material-icons-round"
                            style={{
                                color: getEmotionConfig(dominantEmotion[0]).color,
                                fontSize: '24px'
                            }}
                        >
                            {getEmotionConfig(dominantEmotion[0]).icon}
                        </span>
                        <span className="stat-label">Dominant: {getEmotionConfig(dominantEmotion[0]).label}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState } from 'react';
import './DistractionTimeline.css';

interface DistractionEvent {
    time: string;
    type: 'looking_away' | 'eyes_closed' | 'head_turned' | 'gaze_away' | 'face_not_visible' | 'low_focus';
    timestamp: number; // position percentage (0-100)
    rawTimestamp?: string; // original ISO timestamp
}

interface DistractionEventData {
    id: number;
    timestamp: string;
    distraction_type: string;
    focus_score: number;
    gaze_deviation: number;
}

interface DistractionTimelineProps {
    startTime: string; // "2:30 PM"
    sessionDuration: number; // in minutes
    distractionEvents?: DistractionEventData[];
    sessionStartTime?: string; // ISO datetime from session
}

export default function DistractionTimeline({ startTime, sessionDuration, distractionEvents = [], sessionStartTime }: DistractionTimelineProps) {
    const [hoveredEvent, setHoveredEvent] = useState<DistractionEvent | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Convert SQLite datetime to Date object (local time, not UTC)
    const parseTimestamp = (timestamp: string): number => {
        // SQLite format: "YYYY-MM-DD HH:MM:SS" - treat as local time, not UTC
        // Just replace space with T, don't add Z (which would make it UTC)
        const isoTimestamp = timestamp.replace(' ', 'T');
        return new Date(isoTimestamp).getTime();
    };

    // Calculate timeline bounds dynamically based on actual distraction data
    const calculateSessionBounds = () => {
        if (distractionEvents.length === 0) {
            return { startMs: Date.now(), durationMs: 60 * 60 * 1000 }; // Default 1 hour
        }

        const timestamps = distractionEvents
            .filter(e => e && e.timestamp && typeof e.timestamp === 'string')
            .map(e => parseTimestamp(e.timestamp));
        
        if (timestamps.length === 0) {
            return { startMs: Date.now(), durationMs: 60 * 60 * 1000 };
        }

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
        const eventMs = parseTimestamp(timestamp);
        const position = ((eventMs - startMs) / durationMs) * 100;
        return Math.max(0, Math.min(100, position));
    };

    // Convert real distraction events from API
    const convertDistractionEvents = (): DistractionEvent[] => {
        console.log('[DistractionTimeline] Raw distractionEvents:', distractionEvents);
        
        if (!distractionEvents || distractionEvents.length === 0) {
            console.log('[DistractionTimeline] No events provided, using mock data');
            return generateMockDistractionEvents();
        }

        // Filter out invalid events (null, undefined, or missing timestamp)
        const validEvents = distractionEvents.filter(event => 
            event && event.timestamp && typeof event.timestamp === 'string'
        );

        console.log('[DistractionTimeline] Valid events after filtering:', validEvents.length);

        if (validEvents.length === 0) {
            console.log('[DistractionTimeline] No valid events, using mock data');
            return generateMockDistractionEvents();
        }
        
        return validEvents.map(event => {
            // Convert SQLite datetime format to ISO format and parse
            const eventMs = parseTimestamp(event.timestamp);
            
            // Check if date is valid
            if (isNaN(eventMs)) {
                console.warn('Invalid timestamp:', event.timestamp);
                return null;
            }
            
            const eventTime = new Date(eventMs);
            
            // Map database distraction types to display types
            let displayType: DistractionEvent['type'];
            switch (event.distraction_type) {
                case 'gaze_away':
                    displayType = 'gaze_away';
                    break;
                case 'face_not_visible':
                    displayType = 'face_not_visible';
                    break;
                case 'low_focus':
                    displayType = 'low_focus';
                    break;
                case 'looking_away':
                    displayType = 'looking_away';
                    break;
                case 'eyes_closed':
                    displayType = 'eyes_closed';
                    break;
                case 'head_turned':
                    displayType = 'head_turned';
                    break;
                default:
                    displayType = event.distraction_type as DistractionEvent['type'];
            }
            
            return {
                time: eventTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
                type: displayType,
                timestamp: getEventPosition(event.timestamp),
                rawTimestamp: event.timestamp
            };
        }).filter(event => event !== null) as DistractionEvent[];
    };

    // Generate mock distraction events (fallback)
    const generateMockDistractionEvents = (): DistractionEvent[] => {
        const events: DistractionEvent[] = [];
        
        // Generate realistic distraction events throughout the session
        const eventTimes = [
            { timestamp: 15, type: 'looking_away' },
            { timestamp: 32, type: 'head_turned' },
            { timestamp: 47, type: 'eyes_closed' },
            { timestamp: 68, type: 'looking_away' },
            { timestamp: 85, type: 'head_turned' },
            { timestamp: 92, type: 'looking_away' },
            { timestamp: 110, type: 'eyes_closed' },
            { timestamp: 127, type: 'head_turned' },
        ];

        eventTimes.forEach(({ timestamp, type }) => {
            if (timestamp <= sessionDuration) {
                const startHour = parseInt(startTime.split(':')[0]);
                const startMinute = parseInt(startTime.split(':')[1].split(' ')[0]);
                const isPM = startTime.includes('PM');
                
                const eventMinutes = (isPM && startHour !== 12 ? startHour + 12 : startHour) * 60 + startMinute + timestamp;
                const eventHour = Math.floor(eventMinutes / 60);
                const eventMin = eventMinutes % 60;
                
                const displayHour = eventHour > 12 ? eventHour - 12 : eventHour;
                const timeString = `${displayHour}:${eventMin.toString().padStart(2, '0')} ${eventHour >= 12 ? 'PM' : 'AM'}`;
                
                events.push({
                    time: timeString,
                    type: type as DistractionEvent['type'],
                    timestamp
                });
            }
        });

        return events;
    };

    const processedDistractionEvents = convertDistractionEvents();

    // Show empty state if no distractions
    if (processedDistractionEvents.length === 0) {
        return (
            <div className="distraction-timeline-container">
                <div className="timeline-empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span className="material-icons-round" style={{ fontSize: '48px', color: '#4CAF50', marginBottom: '8px' }}>
                        check_circle
                    </span>
                    <p>No distractions detected in this session!</p>
                    <p style={{ fontSize: '12px', opacity: 0.7 }}>
                        Great focus throughout your study session
                    </p>
                </div>
            </div>
        );
    }

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

    const getEventIcon = (type: DistractionEvent['type']) => {
        switch (type) {
            case 'looking_away':
            case 'gaze_away':
                return 'visibility_off';
            case 'eyes_closed':
            case 'low_focus':
                return 'remove_red_eye';
            case 'head_turned':
                return 'screen_rotation';
            case 'face_not_visible':
                return 'person_off';
            default:
                return 'warning';
        }
    };

    const getEventColor = (type: DistractionEvent['type']) => {
        switch (type) {
            case 'looking_away':
            case 'gaze_away':
                return '#ff9800';
            case 'eyes_closed':
            case 'low_focus':
                return '#f44336';
            case 'head_turned':
                return '#9c27b0';
            case 'face_not_visible':
                return '#e91e63';
            default:
                return '#666';
        }
    };

    const getEventLabel = (type: DistractionEvent['type']) => {
        switch (type) {
            case 'looking_away':
                return 'Looking Away';
            case 'gaze_away':
                return 'Gaze Away';
            case 'eyes_closed':
                return 'Eyes Closed';
            case 'low_focus':
                return 'Low Focus';
            case 'head_turned':
                return 'Head Turned';
            case 'face_not_visible':
                return 'Face Not Visible';
            default:
                return 'Distraction';
        }
    };

    const handleEventHover = (event: DistractionEvent, e: React.MouseEvent) => {
        setHoveredEvent(event);
        setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleEventLeave = () => {
        setHoveredEvent(null);
    };

    return (
        <div className="distraction-timeline-container">
            <div className="timeline-legend">
                <div className="legend-item">
                    <span className="material-icons-round legend-icon" style={{ color: '#ff9800' }}>
                        visibility_off
                    </span>
                    <span>Looking/Gaze Away</span>
                </div>
                <div className="legend-item">
                    <span className="material-icons-round legend-icon" style={{ color: '#f44336' }}>
                        remove_red_eye
                    </span>
                    <span>Eyes Closed/Low Focus</span>
                </div>
                <div className="legend-item">
                    <span className="material-icons-round legend-icon" style={{ color: '#e91e63' }}>
                        person_off
                    </span>
                    <span>Face Not Visible</span>
                </div>
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
                    
                    {/* Distraction events */}
                    {processedDistractionEvents.map((event, index) => (
                        <div
                            key={index}
                            className="distraction-event"
                            style={{ 
                                left: `${event.timestamp}%`,
                                color: getEventColor(event.type)
                            }}
                            onMouseEnter={(e) => handleEventHover(event, e)}
                            onMouseLeave={handleEventLeave}
                            onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                        >
                            <span className="material-icons-round event-icon">
                                {getEventIcon(event.type)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip */}
            {hoveredEvent && (
                <div 
                    className="timeline-tooltip"
                    style={{
                        left: mousePosition.x - 100,
                        top: mousePosition.y - 60,
                        position: 'fixed',
                        pointerEvents: 'none'
                    }}
                >
                    <div className="tooltip-time">{hoveredEvent.time}</div>
                    <div className="tooltip-event">{getEventLabel(hoveredEvent.type)}</div>
                </div>
            )}

            <div className="timeline-summary">
                <div className="summary-stat">
                    <span className="stat-value">{processedDistractionEvents.length}</span>
                    <span className="stat-label">Total Events</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{processedDistractionEvents.filter(e => e.type === 'looking_away' || e.type === 'gaze_away').length}</span>
                    <span className="stat-label">Gaze Issues</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{processedDistractionEvents.filter(e => e.type === 'eyes_closed' || e.type === 'low_focus').length}</span>
                    <span className="stat-label">Focus Issues</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{processedDistractionEvents.filter(e => e.type === 'face_not_visible').length}</span>
                    <span className="stat-label">Not Visible</span>
                </div>
            </div>
        </div>
    );
}
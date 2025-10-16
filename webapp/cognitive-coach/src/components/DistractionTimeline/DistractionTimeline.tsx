import { useState } from 'react';
import './DistractionTimeline.css';

interface DistractionEvent {
    time: string;
    type: 'looking_away' | 'eyes_closed' | 'head_turned';
    timestamp: number; // minutes from session start
}

interface DistractionTimelineProps {
    startTime: string; // "2:30 PM"
    sessionDuration: number; // in minutes
}

export default function DistractionTimeline({ startTime, sessionDuration }: DistractionTimelineProps) {
    const [hoveredEvent, setHoveredEvent] = useState<DistractionEvent | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Generate mock distraction events
    const generateDistractionEvents = (): DistractionEvent[] => {
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

    const distractionEvents = generateDistractionEvents();

    // Generate time markers for the timeline
    const generateTimeMarkers = () => {
        const markers = [];
        const markerInterval = 30; // Every 30 minutes
        
        for (let i = 0; i <= sessionDuration; i += markerInterval) {
            const startHour = parseInt(startTime.split(':')[0]);
            const startMinute = parseInt(startTime.split(':')[1].split(' ')[0]);
            const isPM = startTime.includes('PM');
            
            const markerMinutes = (isPM && startHour !== 12 ? startHour + 12 : startHour) * 60 + startMinute + i;
            const markerHour = Math.floor(markerMinutes / 60);
            const markerMin = markerMinutes % 60;
            
            const displayHour = markerHour > 12 ? markerHour - 12 : markerHour;
            const timeString = `${displayHour}:${markerMin.toString().padStart(2, '0')}`;
            
            markers.push({
                time: timeString,
                position: (i / sessionDuration) * 100
            });
        }
        
        return markers;
    };

    const timeMarkers = generateTimeMarkers();

    const getEventIcon = (type: DistractionEvent['type']) => {
        switch (type) {
            case 'looking_away':
                return 'visibility_off';
            case 'eyes_closed':
                return 'remove_red_eye';
            case 'head_turned':
                return 'rotate_90_degrees_ccw';
            default:
                return 'warning';
        }
    };

    const getEventColor = (type: DistractionEvent['type']) => {
        switch (type) {
            case 'looking_away':
                return '#ff9800';
            case 'eyes_closed':
                return '#f44336';
            case 'head_turned':
                return '#9c27b0';
            default:
                return '#666';
        }
    };

    const getEventLabel = (type: DistractionEvent['type']) => {
        switch (type) {
            case 'looking_away':
                return 'Looking Away';
            case 'eyes_closed':
                return 'Eyes Closed';
            case 'head_turned':
                return 'Head Turned';
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
                    <span>Looking Away</span>
                </div>
                <div className="legend-item">
                    <span className="material-icons-round legend-icon" style={{ color: '#f44336' }}>
                        remove_red_eye
                    </span>
                    <span>Eyes Closed</span>
                </div>
                <div className="legend-item">
                    <span className="material-icons-round legend-icon" style={{ color: '#9c27b0' }}>
                        rotate_90_degrees_ccw
                    </span>
                    <span>Head Turned</span>
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
                    {distractionEvents.map((event, index) => (
                        <div
                            key={index}
                            className="distraction-event"
                            style={{ 
                                left: `${(event.timestamp / sessionDuration) * 100}%`,
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
                    <span className="stat-value">{distractionEvents.length}</span>
                    <span className="stat-label">Total Events</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{distractionEvents.filter(e => e.type === 'looking_away').length}</span>
                    <span className="stat-label">Looking Away</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{distractionEvents.filter(e => e.type === 'eyes_closed').length}</span>
                    <span className="stat-label">Eyes Closed</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{distractionEvents.filter(e => e.type === 'head_turned').length}</span>
                    <span className="stat-label">Head Turned</span>
                </div>
            </div>
        </div>
    );
}
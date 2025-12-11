import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './FocusChart.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface FocusDataPoint {
    timestamp: string;
    focusScore: number | null;
    faceDetected: boolean;
    emotion: string | null;
}

interface FocusChartProps {
    averageFocus: number | null;
    peakFocus?: number | null;
    lowestFocus?: number | null;
    timeSeries?: FocusDataPoint[];
}

export default function FocusChart({ averageFocus, peakFocus, lowestFocus, timeSeries }: FocusChartProps) {
    // Format timestamp to readable time (HH:MM)
    // SQLite stores timestamps without timezone info, so we treat them as local time
    const formatTime = (timestamp: string) => {
        // If timestamp doesn't have timezone indicator, treat as local time
        // Replace space with T for ISO format, but don't add Z (which would make it UTC)
        let dateStr = timestamp;
        if (!timestamp.includes('Z') && !timestamp.includes('+') && !timestamp.includes('-', 10)) {
            dateStr = timestamp.replace(' ', 'T');
        }
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Use real time series data if available, otherwise show empty state
    const hasData = timeSeries && timeSeries.length > 0;

    // Filter out only null focus scores (keep 0 values - they represent no face detected)
    const validData = hasData
        ? timeSeries.filter(point => point.focusScore !== null && point.focusScore !== undefined)
        : [];

    const labels = validData.map(point => formatTime(point.timestamp));
    const dataPoints = validData.map(point => point.focusScore as number);

    // Calculate stats from real data or use provided props
    const calculatedAverage = validData.length > 0
        ? Math.round(dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length)
        : null;
    const calculatedPeak = validData.length > 0 ? Math.max(...dataPoints) : null;
    const calculatedLowest = validData.length > 0 ? Math.min(...dataPoints) : null;

    // Use provided values or calculated ones
    const displayAverage = averageFocus ?? calculatedAverage;
    const displayPeak = peakFocus ?? calculatedPeak;
    const displayLowest = lowestFocus ?? calculatedLowest;

    const data = {
        labels,
        datasets: [
            {
                label: 'Focus Score',
                data: dataPoints,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#4CAF50',
                pointBorderColor: '#4CAF50',
                pointBorderWidth: 2,
                pointRadius: dataPoints.length > 50 ? 0 : 4, // Hide points if too many data points
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#4CAF50',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    label: function(context: any) {
                        return `Focus: ${context.parsed.y}%`;
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Time',
                    font: {
                        size: 14,
                        weight: 'bold' as const
                    },
                    color: '#666'
                },
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    color: '#666',
                    font: {
                        size: 12
                    },
                    maxTicksLimit: 10
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Focus Score (%)',
                    font: {
                        size: 14,
                        weight: 'bold' as const
                    },
                    color: '#666'
                },
                min: 0,
                max: 100,
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    color: '#666',
                    font: {
                        size: 12
                    },
                    stepSize: 20,
                    callback: function(value: any) {
                        return value + '%';
                    }
                }
            }
        }
    };

    // Show empty state if no data
    if (!hasData || validData.length === 0) {
        return (
            <div className="focus-chart-container">
                <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#666' }}>
                        <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '8px', opacity: 0.5 }}>
                            show_chart
                        </span>
                        <p style={{ margin: 0 }}>No focus data recorded for this session</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                            Enable webcam during your session to track focus
                        </p>
                    </div>
                </div>
                <div className="chart-summary">
                    <div className="summary-stat">
                        <span className="stat-label">Average Focus</span>
                        <span className="stat-value">--</span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Peak Focus</span>
                        <span className="stat-value">--</span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Lowest Focus</span>
                        <span className="stat-value">--</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="focus-chart-container">
            <div className="chart-wrapper">
                <Line data={data} options={options} />
            </div>
            <div className="chart-summary">
                <div className="summary-stat">
                    <span className="stat-label">Average Focus</span>
                    <span className="stat-value">{displayAverage !== null ? `${displayAverage}%` : '--'}</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-label">Peak Focus</span>
                    <span className="stat-value">{displayPeak !== null ? `${displayPeak}%` : '--'}</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-label">Lowest Focus</span>
                    <span className="stat-value">{displayLowest !== null ? `${displayLowest}%` : '--'}</span>
                </div>
            </div>
        </div>
    );
}
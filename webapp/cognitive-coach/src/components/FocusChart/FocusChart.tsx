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

interface FocusChartProps {
    startTime: string; // "2:30 PM"
    endTime: string;   // "4:45 PM"
    averageFocus: number; // 88
}

export default function FocusChart({ startTime, endTime, averageFocus }: FocusChartProps) {
    // Generate fake focus score data based on the session timeline
    const generateFocusData = () => {
        // Convert time to minutes for easier calculation
        const parseTime = (timeStr: string) => {
            const [time, period] = timeStr.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            const hour24 = period === 'PM' && hours !== 12 ? hours + 12 : hours;
            return hour24 * 60 + minutes;
        };

        const startMinutes = parseTime(startTime);
        const endMinutes = parseTime(endTime);
        const sessionDuration = endMinutes - startMinutes;
        
        // Generate data points every 5 minutes
        const dataPoints = [];
        const labels = [];
        
        for (let i = 0; i <= sessionDuration; i += 5) {
            const currentMinutes = startMinutes + i;
            const currentHour = Math.floor(currentMinutes / 60);
            const currentMin = currentMinutes % 60;
            const displayHour = currentHour > 12 ? currentHour - 12 : currentHour;
            const timeLabel = `${displayHour}:${currentMin.toString().padStart(2, '0')}`;
            
            labels.push(timeLabel);
            
            // Generate realistic focus score variations with larger range and clear trends
            let focusScore;
            const progress = i / sessionDuration;
            
            if (progress < 0.05) {
                // Session startup - low focus as student settles in
                focusScore = 20 + Math.random() * 15;
            } else if (progress < 0.15) {
                // Ramping up - focus increases as student gets into flow
                focusScore = 35 + (progress - 0.05) * 400 + Math.random() * 10;
            } else if (progress < 0.35) {
                // High focus period - peak performance
                focusScore = 85 + Math.random() * 12 - 6;
            } else if (progress < 0.45) {
                // Break period - significant focus drop
                focusScore = 25 + Math.random() * 20;
            } else if (progress < 0.65) {
                // Recovery period - gradual improvement
                focusScore = 50 + (progress - 0.45) * 150 + Math.random() * 15 - 7;
            } else if (progress < 0.85) {
                // Focus fatigue - declining attention
                focusScore = 80 - (progress - 0.65) * 100 + Math.random() * 20 - 10;
            } else {
                // End of session - final push but lower overall
                focusScore = 40 + Math.random() * 25;
            }
            
            // Ensure score stays within bounds but allow full range
            focusScore = Math.max(5, Math.min(100, focusScore));
            dataPoints.push(Math.round(focusScore));
        }
        
        return { labels, dataPoints };
    };

    const { labels, dataPoints } = generateFocusData();

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
                pointRadius: 4,
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

    return (
        <div className="focus-chart-container">
            <div className="chart-wrapper">
                <Line data={data} options={options} />
            </div>
            <div className="chart-summary">
                <div className="summary-stat">
                    <span className="stat-label">Average Focus</span>
                    <span className="stat-value">{averageFocus}%</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-label">Peak Focus</span>
                    <span className="stat-value">{Math.max(...dataPoints)}%</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-label">Lowest Focus</span>
                    <span className="stat-value">{Math.min(...dataPoints)}%</span>
                </div>
            </div>
        </div>
    );
}
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
    averageFocus: number; // 88
}

export default function FocusChart({ averageFocus }: FocusChartProps) {
    // Static mock focus score data - realistic pattern for 2h 15m session (2:30 PM - 4:45 PM)
    const labels = [
        '2:30', '2:35', '2:40', '2:45', '2:50', '2:55', '3:00', '3:05', '3:10', '3:15', 
        '3:20', '3:25', '3:30', '3:35', '3:40', '3:45', '3:50', '3:55', '4:00', '4:05',
        '4:10', '4:15', '4:20', '4:25', '4:30', '4:35', '4:40', '4:45'
    ];
    
    const dataPoints = [
        25, 32, 45, 58, 72, 85, 92, 89, 95, 88,  // Session start to high focus
        35, 28, 42, 55, 68, 75, 82, 78, 85, 72,  // Break period to recovery
        68, 62, 55, 48, 52, 58, 45, 38           // Focus fatigue to end
    ];

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
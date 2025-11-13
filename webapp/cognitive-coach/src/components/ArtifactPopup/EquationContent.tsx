import React from 'react';

interface EquationContentProps {
    artifact: {
        id: number;
        type: string;
        title: string;
        content: string;
    };
}

export default function EquationContent({ artifact }: EquationContentProps) {
    // Parse JSON content
    let equation;
    try {
        equation = JSON.parse(artifact.content);
    } catch (error) {
        console.error('Error parsing equation content:', error);
        return <div>Error loading equation</div>;
    }

    return (
        <div className="equation-popup">
            <div className="equation-title">
                <h4>{equation.title || artifact.title}</h4>
            </div>
            <div className="equation-content">
                <p>{equation.equation}</p>
            </div>
            {equation.description && (
                <div className="equation-description" style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{equation.description}</p>
                </div>
            )}
        </div>
    );
}
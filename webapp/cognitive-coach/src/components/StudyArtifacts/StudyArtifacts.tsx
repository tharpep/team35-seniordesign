import { useState, useMemo } from 'react';

interface RawArtifact {
    id: number;
    type: string;
    title: string;
    content: string;
}

interface DisplayArtifact {
    id: string;
    type: 'flashcard' | 'MCQ' | 'equation';
    title: string;
    preview: string;
}

interface StudyArtifactsProps {
    artifacts: RawArtifact[];
    onArtifactClick: (artifactType: 'flashcard' | 'MCQ' | 'equation', artifactId: number) => void;
}

export default function StudyArtifacts({ artifacts, onArtifactClick }: StudyArtifactsProps) {
    const [activeArtifactTab, setActiveArtifactTab] = useState<'all' | 'flashcard' | 'MCQ' | 'equation'>('all');

    // Transform API artifacts into display format
    const displayArtifacts = useMemo(() => {
        return artifacts
            .filter(artifact => {
                // Only include flashcards, multiple_choice, and equations
                // Filter out insights (they're displayed in the sidebar)
                return artifact.type === 'flashcard' || 
                       artifact.type === 'multiple_choice' || 
                       artifact.type === 'equation';
            })
            .map((artifact) => {
                try {
                    const content = JSON.parse(artifact.content);
                    
                    // Flashcards
                    if (artifact.type === 'flashcard') {
                        return {
                            id: `fc_${artifact.id}`,
                            type: 'flashcard' as const,
                            title: '',
                            preview: content.front || artifact.title
                        };
                    }
                    
                    // Multiple Choice Questions
                    if (artifact.type === 'multiple_choice') {
                        return {
                            id: `mcq_${artifact.id}`,
                            type: 'MCQ' as const,
                            title: '',
                            preview: content.stem || artifact.title
                        };
                    }
                    
                    // Equations
                    if (artifact.type === 'equation') {
                        return {
                            id: `eq_${artifact.id}`,
                            type: 'equation' as const,
                            title: content.title || artifact.title,
                            preview: content.equation || content.title
                        };
                    }
                    
                    // Should never reach here due to filter above
                    return null;
                } catch (error) {
                    console.error('Error parsing artifact content:', error);
                    return null;
                }
            })
            .filter((artifact): artifact is DisplayArtifact => artifact !== null);
    }, [artifacts]);

    const filteredArtifacts = useMemo(() => {
        return activeArtifactTab === 'all' 
            ? displayArtifacts 
            : displayArtifacts.filter(artifact => artifact.type === activeArtifactTab);
    }, [displayArtifacts, activeArtifactTab]);

    const counts = useMemo(() => {
        return {
            flashcard: displayArtifacts.filter(a => a.type === 'flashcard').length,
            MCQ: displayArtifacts.filter(a => a.type === 'MCQ').length,
            equation: displayArtifacts.filter(a => a.type === 'equation').length,
            total: displayArtifacts.length
        };
    }, [displayArtifacts]);

    if (artifacts.length === 0) {
        return (
            <div className="section card">
                <h2>
                    <span className="material-icons-round section-icon">auto_awesome</span>
                    Study Artifacts
                </h2>
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No artifacts generated for this session yet.
                </div>
            </div>
        );
    }

    return (
        <div className="section card">
            <h2>
                <span className="material-icons-round section-icon">auto_awesome</span>
                Study Artifacts
            </h2>
            <div className="tabs">
                <button 
                    className={`tab ${activeArtifactTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveArtifactTab('all')}
                >
                    All Artifacts ({counts.total})
                </button>
                <button 
                    className={`tab ${activeArtifactTab === 'flashcard' ? 'active' : ''}`}
                    onClick={() => setActiveArtifactTab('flashcard')}
                >
                    Flashcards ({counts.flashcard})
                </button>
                <button 
                    className={`tab ${activeArtifactTab === 'MCQ' ? 'active' : ''}`}
                    onClick={() => setActiveArtifactTab('MCQ')}
                >
                    MCQ ({counts.MCQ})
                </button>
                <button 
                    className={`tab ${activeArtifactTab === 'equation' ? 'active' : ''}`}
                    onClick={() => setActiveArtifactTab('equation')}
                >
                    Equations ({counts.equation})
                </button>
            </div>
            <div className="artifact-grid">
                {filteredArtifacts.map((artifact) => {
                    // Extract the original artifact ID from the display artifact ID
                    const originalId = parseInt(artifact.id.split('_')[1]);
                    
                    return (
                        <div 
                            key={artifact.id} 
                            className="artifact-card"
                            onClick={() => onArtifactClick(artifact.type, originalId)}
                        >
                            <div className={`artifact-type ${artifact.type}`}>
                                {artifact.type === 'MCQ' ? 'MCQ' : 
                                 artifact.type.charAt(0).toUpperCase() + artifact.type.slice(1)}
                            </div>
                            {artifact.type === 'equation' && artifact.title && (
                                <div className="artifact-title">{artifact.title}</div>
                            )}
                            <div className="artifact-preview">{artifact.preview}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
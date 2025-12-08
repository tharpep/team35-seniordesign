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
    sessionId: string;
    onGenerate: (type: 'flashcard' | 'mcq' | 'insights') => Promise<void>;
}

export default function StudyArtifacts({ artifacts, onArtifactClick, sessionId, onGenerate }: StudyArtifactsProps) {
    const [activeArtifactTab, setActiveArtifactTab] = useState<'all' | 'flashcard' | 'MCQ' | 'equation'>('all');
    const [isGenerating, setIsGenerating] = useState(false);

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
                    
                    // Flashcards - content structure: { artifact_type: "flashcards", cards: [{ front, back, ... }] }
                    if (artifact.type === 'flashcard') {
                        const firstCard = content.cards && content.cards.length > 0 ? content.cards[0] : null;
                        if (!firstCard) {
                            console.warn('Flashcard artifact has no cards:', artifact.id);
                            return null;
                        }
                        return {
                            id: `fc_${artifact.id}`,
                            type: 'flashcard' as const,
                            title: '',
                            preview: firstCard.front || artifact.title
                        };
                    }
                    
                    // Multiple Choice Questions - content structure: { artifact_type: "mcq", questions: [{ stem, options, ... }] }
                    if (artifact.type === 'multiple_choice') {
                        const firstQuestion = content.questions && content.questions.length > 0 ? content.questions[0] : null;
                        if (!firstQuestion) {
                            console.warn('MCQ artifact has no questions:', artifact.id);
                            return null;
                        }
                        return {
                            id: `mcq_${artifact.id}`,
                            type: 'MCQ' as const,
                            title: '',
                            preview: firstQuestion.stem || artifact.title
                        };
                    }
                    
                    // Equations - content structure may vary
                    if (artifact.type === 'equation') {
                        // Try to get equation from various possible structures
                        const equation = content.equation || content.title || artifact.title;
                        return {
                            id: `eq_${artifact.id}`,
                            type: 'equation' as const,
                            title: content.title || artifact.title,
                            preview: equation
                        };
                    }
                    
                    // Should never reach here due to filter above
                    return null;
                } catch (error) {
                    console.error('Error parsing artifact content:', error, artifact);
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

    const handleGenerate = async (type: 'flashcard' | 'mcq' | 'insights') => {
        setIsGenerating(true);
        try {
            await onGenerate(type);
        } catch (error: any) {
            console.error('Generation error:', error);
            alert(error.message || 'Failed to generate artifact');
        } finally {
            setIsGenerating(false);
        }
    };

    if (artifacts.length === 0) {
        return (
            <div className="section card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>
                        <span className="material-icons-round section-icon">auto_awesome</span>
                        Study Artifacts
                    </h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            onClick={() => handleGenerate('flashcard')}
                            disabled={isGenerating}
                            className="secondary-button"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Flashcard'}
                        </button>
                        <button 
                            onClick={() => handleGenerate('mcq')}
                            disabled={isGenerating}
                            className="secondary-button"
                        >
                            {isGenerating ? 'Generating...' : 'Generate MCQ'}
                        </button>
                        <button 
                            onClick={() => handleGenerate('insights')}
                            disabled={isGenerating}
                            className="secondary-button"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Insights'}
                        </button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No artifacts generated for this session yet. Click a button above to generate your first artifact!
                </div>
            </div>
        );
    }

    return (
        <div className="section card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>
                    <span className="material-icons-round section-icon">auto_awesome</span>
                    Study Artifacts
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => handleGenerate('flashcard')}
                        disabled={isGenerating}
                        className="secondary-button"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Flashcard'}
                    </button>
                    <button 
                        onClick={() => handleGenerate('mcq')}
                        disabled={isGenerating}
                        className="secondary-button"
                    >
                        {isGenerating ? 'Generating...' : 'Generate MCQ'}
                    </button>
                    <button 
                        onClick={() => handleGenerate('insights')}
                        disabled={isGenerating}
                        className="secondary-button"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Insights'}
                    </button>
                </div>
            </div>
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
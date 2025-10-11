import { useState } from 'react';
import mockFlashcards from '../../assets/data/mockFlashcards.json';
import mockMCQ from '../../assets/data/mockMCQ.json';

interface Artifact {
    id: string;
    type: 'flashcard' | 'MCQ' | 'equation';
    title: string;
    preview: string;
}

interface StudyArtifactsProps {
    onArtifactClick: (artifactType: 'flashcard' | 'MCQ' | 'equation') => void;
}

// Export artifact counts for use by parent components
export const getArtifactCounts = () => {
    const flashcardCount = mockFlashcards.cards.length;
    const mcqCount = mockMCQ.questions.length;
    const equationCount = 3; // Static count for equations
    
    return {
        flashcard: flashcardCount,
        MCQ: mcqCount,
        equation: equationCount,
        total: flashcardCount + mcqCount + equationCount
    };
};

export default function StudyArtifacts({ onArtifactClick }: StudyArtifactsProps) {
    const [activeArtifactTab, setActiveArtifactTab] = useState<'all' | 'flashcard' | 'MCQ' | 'equation'>('all');

    // Create artifacts from mock data - show all examples
    const flashcardArtifacts: Artifact[] = mockFlashcards.cards.map((card, index) => ({
        id: `fc_${index + 1}`,
        type: 'flashcard' as const,
        title: '', // No title needed for flashcards
        preview: card.front
    }));

    const mcqArtifacts: Artifact[] = mockMCQ.questions.map((question, index) => ({
        id: `mcq_${index + 1}`,
        type: 'MCQ' as const,
        title: '', // No title needed for MCQ
        preview: question.stem
    }));

    const equationArtifacts: Artifact[] = [
        {
            id: 'eq_1',
            type: 'equation' as const,
            title: 'Markovnikov Addition',
            preview: 'R₂C=CH₂ + HX → R₂CH-CH₂X'
        },
        {
            id: 'eq_2',
            type: 'equation' as const,
            title: 'E2 Elimination',
            preview: 'R₃C-CHR-X + Base → R₂C=CR + HX + Base-H⁺'
        },
        {
            id: 'eq_3',
            type: 'equation' as const,
            title: 'Ozonolysis',
            preview: 'R₂C=CR₂ + O₃ → R₂C=O + O=CR₂'
        }
    ];

    const artifacts: Artifact[] = [...flashcardArtifacts, ...mcqArtifacts, ...equationArtifacts];

    const filteredArtifacts = activeArtifactTab === 'all' 
        ? artifacts 
        : artifacts.filter(artifact => artifact.type === activeArtifactTab);

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
                    All Artifacts
                </button>
                <button 
                    className={`tab ${activeArtifactTab === 'flashcard' ? 'active' : ''}`}
                    onClick={() => setActiveArtifactTab('flashcard')}
                >
                    Flashcards ({artifacts.filter(a => a.type === 'flashcard').length})
                </button>
                <button 
                    className={`tab ${activeArtifactTab === 'MCQ' ? 'active' : ''}`}
                    onClick={() => setActiveArtifactTab('MCQ')}
                >
                    MCQ ({artifacts.filter(a => a.type === 'MCQ').length})
                </button>
                <button 
                    className={`tab ${activeArtifactTab === 'equation' ? 'active' : ''}`}
                    onClick={() => setActiveArtifactTab('equation')}
                >
                    Equations ({artifacts.filter(a => a.type === 'equation').length})
                </button>
            </div>
            <div className="artifact-grid">
                {filteredArtifacts.map((artifact) => (
                    <div 
                        key={artifact.id} 
                        className="artifact-card"
                        onClick={() => onArtifactClick(artifact.type)}
                    >
                        <div className={`artifact-type ${artifact.type}`}>
                            {artifact.type.charAt(0).toUpperCase() + artifact.type.slice(1)}
                        </div>
                        {artifact.type === 'equation' && (
                            <div className="artifact-title">{artifact.title}</div>
                        )}
                        <div className="artifact-preview">{artifact.preview}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
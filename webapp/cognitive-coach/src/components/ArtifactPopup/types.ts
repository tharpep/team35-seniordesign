// Shared types for ArtifactPopup components
// TODO: Import this type in SessionDetail.tsx to replace the local PopupState interface

export interface PopupState {
    isOpen: boolean;
    type: 'flashcard' | 'MCQ' | 'equation' | null;
    currentIndex: number;
    showHint: boolean;
    showBack: boolean;
    selectedAnswer: number | null;
    showExplanation: boolean;
}

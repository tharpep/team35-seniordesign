// Mock data exports for Study Coach artifacts
import mockFlashcards from './mockFlashcards.json';
import mockInsights from './mockInsights.json';
import mockMCQ from './mockMCQ.json';

// Type definitions based on schemas
export interface FlashCard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  difficulty?: number;
  source_refs?: string[];
  hints?: string[];
}

export interface FlashcardsArtifact {
  artifact_type: 'flashcards';
  version: string;
  cards: FlashCard[];
  provenance?: Record<string, any>;
  metrics?: Record<string, any>;
}

export interface Insight {
  id: string;
  title: string;
  takeaway: string;
  bullets?: string[];
  action_items?: string[];
  misconceptions?: string[];
  confidence?: number;
  source_refs?: string[];
}

export interface InsightsArtifact {
  artifact_type: 'insights';
  version: string;
  insights: Insight[];
  provenance?: Record<string, any>;
  metrics?: Record<string, any>;
}

export interface MCQQuestion {
  id: string;
  stem: string;
  options: string[];
  answer_index: number;
  rationale: string;
  bloom_level?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  source_refs?: string[];
}

export interface MCQArtifact {
  artifact_type: 'mcq';
  version: string;
  questions: MCQQuestion[];
  provenance?: Record<string, any>;
  metrics?: Record<string, any>;
}

// Typed exports
export const mockFlashcardsData: FlashcardsArtifact = mockFlashcards as FlashcardsArtifact;
export const mockInsightsData: InsightsArtifact = mockInsights as InsightsArtifact;
export const mockMCQData: MCQArtifact = mockMCQ as MCQArtifact;

// Legacy exports for backwards compatibility
export { mockFlashcards, mockInsights, mockMCQ };

// Utility functions for working with mock data
export const getRandomFlashcards = (count: number = 5): FlashCard[] => {
  const shuffled = [...mockFlashcardsData.cards].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

export const getFlashcardsByDifficulty = (difficulty: number): FlashCard[] => {
  return mockFlashcardsData.cards.filter(card => card.difficulty === difficulty);
};

export const getFlashcardsByTag = (tag: string): FlashCard[] => {
  return mockFlashcardsData.cards.filter(card => 
    card.tags?.some(cardTag => cardTag.toLowerCase().includes(tag.toLowerCase()))
  );
};

export const getRandomMCQQuestions = (count: number = 5): MCQQuestion[] => {
  const shuffled = [...mockMCQData.questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

export const getMCQByBloomLevel = (level: string): MCQQuestion[] => {
  return mockMCQData.questions.filter(q => q.bloom_level === level);
};

export const getInsightsByConfidence = (minConfidence: number = 0.8): Insight[] => {
  return mockInsightsData.insights.filter(insight => 
    insight.confidence !== undefined && insight.confidence >= minConfidence
  );
};

export const getAllArtifacts = () => ({
  flashcards: mockFlashcardsData,
  insights: mockInsightsData,
  mcq: mockMCQData
});

export default {
  flashcards: mockFlashcardsData,
  insights: mockInsightsData,
  mcq: mockMCQData,
  utils: {
    getRandomFlashcards,
    getFlashcardsByDifficulty,
    getFlashcardsByTag,
    getRandomMCQQuestions,
    getMCQByBloomLevel,
    getInsightsByConfidence,
    getAllArtifacts
  }
};
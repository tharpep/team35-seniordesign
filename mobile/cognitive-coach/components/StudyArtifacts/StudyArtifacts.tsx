import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card } from '../ui';
import { tokens } from '../../styles/theme';
import mockFlashcards from '../../assets/data/mockFlashcards.json';
import mockMCQ from '../../assets/data/mockMCQ.json';

interface Artifact {
  id: string;
  type: 'flashcard' | 'MCQ' | 'equation';
  title: string;
  preview: string;
}

interface StudyArtifactsProps {
  onArtifactClick?: (artifactType: 'flashcard' | 'MCQ' | 'equation', artifactId: string) => void;
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

const getArtifactTypeStyle = (type: string) => {
  switch (type) {
    case 'flashcard':
      return {
        backgroundColor: tokens.colors.flashcardBg,
        borderColor: tokens.colors.flashcardBorder,
      };
    case 'MCQ':
      return {
        backgroundColor: tokens.colors.questionBg,
        borderColor: tokens.colors.questionBorder,
      };
    case 'equation':
      return {
        backgroundColor: tokens.colors.successBg,
        borderColor: tokens.colors.successBorder,
      };
    default:
      return {};
  }
};

const getArtifactTypeTextStyle = (type: string) => {
  switch (type) {
    case 'flashcard':
      return { color: tokens.colors.flashcardText };
    case 'MCQ':
      return { color: tokens.colors.questionText };
    case 'equation':
      return { color: tokens.colors.successText };
    default:
      return {};
  }
};

export default function StudyArtifacts({ onArtifactClick }: StudyArtifactsProps) {
  const [activeTab, setActiveTab] = useState<'flashcard' | 'MCQ' | 'equation'>('flashcard');

  // Create artifacts from mock data
  const flashcardArtifacts: Artifact[] = mockFlashcards.cards.map((card, index) => ({
    id: `fc_${index + 1}`,
    type: 'flashcard' as const,
    title: '',
    preview: card.front
  }));

  const mcqArtifacts: Artifact[] = mockMCQ.questions.map((question, index) => ({
    id: `mcq_${index + 1}`,
    type: 'MCQ' as const,
    title: '',
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

  const getArtifactsForTab = () => {
    switch (activeTab) {
      case 'flashcard':
        return flashcardArtifacts;
      case 'MCQ':
        return mcqArtifacts;
      case 'equation':
        return equationArtifacts;
      default:
        return flashcardArtifacts;
    }
  };

  const handleArtifactClick = (artifact: Artifact) => {
    if (onArtifactClick) {
      onArtifactClick(artifact.type, artifact.id);
    } else {
      // Navigate to appropriate study page
      if (artifact.type === 'flashcard') {
        router.push('/flashcard-study');
      } else {
        // For other types, show console log for now
        console.log('Navigate to artifact:', artifact.type, artifact.id);
      }
    }
  };

  const artifacts = getArtifactsForTab();
  const counts = getArtifactCounts();

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✨</Text>
        <Typography variant="titleMedium" style={styles.headerTitle}>
          Study Artifacts
        </Typography>
      </View>

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'flashcard' && styles.activeTab]}
          onPress={() => setActiveTab('flashcard')}
        >
          <Typography variant="bodyMedium" style={activeTab === 'flashcard' ? styles.activeTabText : styles.tabText}>
            Flashcards ({counts.flashcard})
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'MCQ' && styles.activeTab]}
          onPress={() => setActiveTab('MCQ')}
        >
          <Typography variant="bodyMedium" style={activeTab === 'MCQ' ? styles.activeTabText : styles.tabText}>
            MCQ ({counts.MCQ})
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'equation' && styles.activeTab]}
          onPress={() => setActiveTab('equation')}
        >
          <Typography variant="bodyMedium" style={activeTab === 'equation' ? styles.activeTabText : styles.tabText}>
            Equations ({counts.equation})
          </Typography>
        </TouchableOpacity>
      </ScrollView>

      {/* Artifact Column */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.artifactsScroll}
        contentContainerStyle={styles.artifactsContent}
      >
        {artifacts.map((artifact) => (
          <TouchableOpacity
            key={artifact.id}
            style={styles.artifactCard}
            onPress={() => handleArtifactClick(artifact)}
            activeOpacity={0.7}
          >
            <View style={[styles.artifactType, getArtifactTypeStyle(artifact.type)]}>
              <Typography variant="bodySmall" style={{
                ...styles.artifactTypeText,
                ...getArtifactTypeTextStyle(artifact.type)
              }}>
                {artifact.type === 'MCQ' ? 'MCQ' : artifact.type.charAt(0).toUpperCase() + artifact.type.slice(1)}
              </Typography>
            </View>
            
            {artifact.type === 'equation' && artifact.title && (
              <Typography variant="bodyMedium" style={styles.artifactTitle}>
                {artifact.title}
              </Typography>
            )}
            
            <Typography variant="bodySmall" style={styles.artifactPreview} numberOfLines={3}>
              {artifact.preview}
            </Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontWeight: '500',
  },
  tabsContainer: {
    marginBottom: tokens.spacing.lg,
  },
  tabsContent: {
    paddingHorizontal: tokens.spacing.sm,
  },
  tab: {
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    marginRight: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: tokens.colors.durationBg,
    borderColor: tokens.colors.primary,
  },
  tabText: {
    color: tokens.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  activeTabText: {
    color: tokens.colors.primary,
  },
  artifactsScroll: {
    maxHeight: 360, // Show about 3 cards at a time (120px each + spacing)
  },
  artifactsContent: {
    paddingBottom: tokens.spacing.sm,
  },
  artifactCard: {
    minHeight: 120,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    ...tokens.shadows.sm,
  },
  artifactType: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
  },
  artifactTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  artifactTitle: {
    fontWeight: '500',
    marginBottom: tokens.spacing.sm,
    color: tokens.colors.onSurface,
  },
  artifactPreview: {
    flex: 1,
    color: tokens.colors.onSurfaceVariant,
    lineHeight: 18,
  },
});
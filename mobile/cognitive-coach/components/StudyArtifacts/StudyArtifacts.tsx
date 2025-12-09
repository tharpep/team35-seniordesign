import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card } from '../ui';
import { tokens } from '../../styles/theme';
import { materialsService, Material, FlashcardContent, MultipleChoiceContent, EquationContent } from '../../services/materials.service';

interface Artifact {
  id: number;
  type: 'flashcard' | 'MCQ' | 'equation';
  title: string;
  preview: string;
}

interface StudyArtifactsProps {
  sessionId?: string;
  artifacts?: Material[];
  onArtifactClick?: (artifactType: 'flashcard' | 'MCQ' | 'equation', artifactId: string) => void;
}

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

export default function StudyArtifacts({ sessionId, artifacts = [], onArtifactClick }: StudyArtifactsProps) {
  const [activeTab, setActiveTab] = useState<'flashcard' | 'MCQ' | 'equation'>('flashcard');

  // Parse real artifacts from API
  const { flashcardArtifacts, mcqArtifacts, equationArtifacts, counts } = useMemo(() => {
    const flashcards: Artifact[] = [];
    const mcqs: Artifact[] = [];
    const equations: Artifact[] = [];

    artifacts.forEach((material) => {
      try {
        if (material.type === 'flashcard') {
          const content = materialsService.parseContent<FlashcardContent>(material);
          if (typeof content !== 'string') {
            flashcards.push({
              id: material.id,
              type: 'flashcard',
              title: material.title || '',
              preview: content.question || 'No question available'
            });
          }
        } else if (material.type === 'multiple_choice') {
          const content = materialsService.parseContent<MultipleChoiceContent>(material);
          if (typeof content !== 'string') {
            mcqs.push({
              id: material.id,
              type: 'MCQ',
              title: material.title || '',
              preview: content.question || 'No question available'
            });
          }
        } else if (material.type === 'equation') {
          const content = materialsService.parseContent<EquationContent>(material);
          if (typeof content !== 'string') {
            equations.push({
              id: material.id,
              type: 'equation',
              title: material.title || content.description || '',
              preview: content.formula || 'No formula available'
            });
          }
        }
      } catch (error) {
        console.error('Error parsing material:', material.id, error);
      }
    });

    return {
      flashcardArtifacts: flashcards,
      mcqArtifacts: mcqs,
      equationArtifacts: equations,
      counts: {
        flashcard: flashcards.length,
        MCQ: mcqs.length,
        equation: equations.length,
        total: flashcards.length + mcqs.length + equations.length
      }
    };
  }, [artifacts]);

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
      onArtifactClick(artifact.type, artifact.id.toString());
    } else {
      // Navigate to appropriate study page
      if (artifact.type === 'flashcard') {
        router.push('/flashcard-study');
      } else if (artifact.type === 'MCQ') {
        router.push('/mcq-study');
      } else if (artifact.type === 'equation') {
        router.push('/equation-study');
      }
    }
  };

  const displayArtifacts = getArtifactsForTab();

  // Show empty state if no artifacts
  if (artifacts.length === 0) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>✨</Text>
          <Typography variant="titleMedium" style={styles.headerTitle}>
            Study Artifacts
          </Typography>
        </View>
        <View style={styles.emptyState}>
          <Typography variant="bodyMedium" color="secondary" style={{ textAlign: 'center' }}>
            No study artifacts yet.{'\n'}
            They will appear here as you study.
          </Typography>
        </View>
      </Card>
    );
  }

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
        {displayArtifacts.map((artifact) => (
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
  emptyState: {
    paddingVertical: tokens.spacing.xxl,
    paddingHorizontal: tokens.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
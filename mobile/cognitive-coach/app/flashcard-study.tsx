import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Typography, Card, Button } from '../components/ui';
import { tokens } from '../styles/theme';
import mockFlashcards from '../assets/data/mockFlashcards.json';

interface FlashcardState {
  currentIndex: number;
  showBack: boolean;
  showHint: boolean;
}

export default function FlashcardStudy() {
  const params = useLocalSearchParams();
  const [state, setState] = useState<FlashcardState>({
    currentIndex: 0,
    showBack: false,
    showHint: false,
  });

  const cards = mockFlashcards.cards;
  const currentCard = cards[state.currentIndex];
  const totalCards = cards.length;

  const handleCardFlip = () => {
    setState(prev => ({ 
      ...prev, 
      showBack: !prev.showBack,
      showHint: false // Hide hint when flipping
    }));
  };

  const handleShowHint = () => {
    setState(prev => ({ ...prev, showHint: !prev.showHint }));
  };

  const handlePrevious = () => {
    if (state.currentIndex > 0) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        showBack: false,
        showHint: false,
      }));
    }
  };

  const handleNext = () => {
    if (state.currentIndex < totalCards - 1) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        showBack: false,
        showHint: false,
      }));
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!currentCard) {
    return (
      <SafeAreaView style={styles.container}>
        <Typography variant="bodyLarge">No flashcards available</Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="titleMedium" style={styles.headerTitle}>
          Studying Flashcards • {state.currentIndex + 1} of {totalCards}
        </Typography>
      </View>

      {/* Flashcard */}
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.flashcard}
          onPress={handleCardFlip}
          activeOpacity={0.8}
        >
          <Card style={{
            ...styles.flashcardContent,
            ...(!state.showBack ? styles.frontCard : styles.backCard)
          }}>
            {!state.showBack ? (
              // Front Side
              <View style={styles.cardSide}>
                <Typography variant="bodyLarge" style={styles.cardText}>
                  {currentCard.front}
                </Typography>
                
                {/* Hint Section */}
                {currentCard.hints && currentCard.hints.length > 0 && !state.showBack && (
                  <TouchableOpacity
                    style={[styles.hintButton, state.showHint && styles.hintButtonExpanded]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShowHint();
                    }}
                  >
                    <View style={styles.hintHeader}>
                      <Text style={styles.hintIcon}>💡</Text>
                      <Typography variant="bodyMedium" style={styles.hintText}>
                        {state.showHint ? 'Hide Hint' : 'Hint'}
                      </Typography>
                    </View>
                    {state.showHint && (
                      <View style={styles.hintContent}>
                        {currentCard.hints.map((hint: string, index: number) => (
                          <Typography key={index} variant="bodySmall" style={styles.hintContentText}>
                            {hint}
                          </Typography>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                <View style={styles.cardPrompt}>
                  <Text style={styles.promptIcon}>👆</Text>
                  <Typography variant="bodySmall" style={styles.promptText}>
                    Tap to reveal answer
                  </Typography>
                </View>
              </View>
            ) : (
              // Back Side
              <View style={styles.cardSide}>
                <Typography variant="bodyLarge" style={styles.cardText}>
                  {currentCard.back}
                </Typography>
                <View style={styles.cardPrompt}>
                  <Text style={styles.promptIcon}>👆</Text>
                  <Typography variant="bodySmall" style={styles.promptText}>
                    Tap to show question
                  </Typography>
                </View>
              </View>
            )}
          </Card>
        </TouchableOpacity>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, state.currentIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={state.currentIndex === 0}
        >
          <Text style={state.currentIndex === 0 ? styles.navIconDisabled : styles.navIcon}>
            ‹
          </Text>
          <Typography variant="bodyMedium" style={state.currentIndex === 0 ? styles.navTextDisabled : styles.navText}>
            Previous
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, state.currentIndex === totalCards - 1 && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={state.currentIndex === totalCards - 1}
        >
          <Typography variant="bodyMedium" style={state.currentIndex === totalCards - 1 ? styles.navTextDisabled : styles.navText}>
            Next
          </Typography>
          <Text style={state.currentIndex === totalCards - 1 ? styles.navIconDisabled : styles.navIcon}>
            ›
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.outline,
    backgroundColor: tokens.colors.surface,
  },
  headerTitle: {
    fontWeight: '500',
    color: tokens.colors.onSurface,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  flashcard: {
    minHeight: 400,
  },
  flashcardContent: {
    minHeight: 400,
    justifyContent: 'center',
    padding: tokens.spacing.xxl,
    ...tokens.shadows.lg,
    borderWidth: 2,
  },
  cardSide: {
    flex: 1,
    justifyContent: 'center',
  },

  frontCard: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.lightGray,
  },
  backCard: {
    borderColor: tokens.colors.success,
    backgroundColor: tokens.colors.successBg,
  },
  cardText: {
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: tokens.spacing.xl,
    color: tokens.colors.onSurface,
    fontSize: 18,
    fontWeight: '500',
  },
  hintButton: {
    backgroundColor: '#fff3e0', // Webapp hint color
    borderColor: '#ffcc02',
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    marginVertical: tokens.spacing.lg,
    alignSelf: 'center',
  },
  hintButtonExpanded: {
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.md,
    backgroundColor: '#fff8e1', // Expanded hint color from webapp
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  },
  hintIcon: {
    fontSize: 16,
  },
  hintText: {
    color: '#e65100', // Webapp hint text color
    fontWeight: '500',
  },
  hintContent: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#ffcc02', // Match webapp hint border
  },
  hintContentText: {
    textAlign: 'center',
    color: '#e65100', // Webapp hint text color
    lineHeight: 20,
    fontSize: 14,
  },
  cardPrompt: {
    alignItems: 'center',
    marginTop: tokens.spacing.xl,
  },
  promptIcon: {
    fontSize: 20,
    marginBottom: tokens.spacing.xs,
  },
  promptText: {
    color: tokens.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: tokens.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.outline,
    backgroundColor: tokens.colors.surface,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.primary,
    minWidth: 100,
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  },
  navButtonDisabled: {
    backgroundColor: tokens.colors.outline,
  },
  navIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  navIconDisabled: {
    color: tokens.colors.onSurfaceVariant,
  },
  navText: {
    color: 'white',
    fontWeight: '500',
  },
  navTextDisabled: {
    color: tokens.colors.onSurfaceVariant,
  },
});
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card } from '../components/ui';
import { tokens } from '../styles/theme';
import mockMCQ from '../assets/data/mockMCQ.json';

interface MCQState {
  currentIndex: number;
  selectedAnswer: number | null;
  showExplanation: boolean;
}

export default function MCQStudy() {
  const [state, setState] = useState<MCQState>({
    currentIndex: 0,
    selectedAnswer: null,
    showExplanation: false,
  });

  const questions = mockMCQ.questions;
  const currentQuestion = questions[state.currentIndex];
  const totalQuestions = questions.length;

  const handleAnswerSelect = (answerIndex: number) => {
    setState(prev => ({ 
      ...prev, 
      selectedAnswer: answerIndex,
      showExplanation: true
    }));
  };

  const handlePrevious = () => {
    if (state.currentIndex > 0) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        selectedAnswer: null,
        showExplanation: false,
      }));
    }
  };

  const handleNext = () => {
    if (state.currentIndex < totalQuestions - 1) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswer: null,
        showExplanation: false,
      }));
    }
  };

  const isCorrect = state.selectedAnswer === currentQuestion?.answer_index;

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Typography variant="bodyLarge">No questions available</Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="titleMedium" style={styles.headerTitle}>
          Multiple Choice • {state.currentIndex + 1} of {totalQuestions}
        </Typography>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Question */}
        <Card style={styles.questionCard}>
          <Typography variant="titleMedium" style={styles.questionLabel}>
            Question
          </Typography>
          <Typography variant="bodyLarge" style={styles.questionText}>
            {currentQuestion.stem}
          </Typography>
        </Card>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionCard,
                state.selectedAnswer === index && styles.selectedOption,
                state.showExplanation && index === currentQuestion.answer_index && styles.correctOption,
                state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.answer_index && styles.incorrectOption
              ]}
              onPress={() => !state.showExplanation && handleAnswerSelect(index)}
              disabled={state.showExplanation}
              activeOpacity={state.showExplanation ? 1 : 0.7}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.radioButton,
                  state.selectedAnswer === index && styles.radioButtonSelected,
                  state.showExplanation && index === currentQuestion.answer_index && styles.radioButtonCorrect,
                  state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.answer_index && styles.radioButtonIncorrect
                ]}>
                  {state.selectedAnswer === index && (
                    <View style={[
                      styles.radioButtonInner,
                      state.showExplanation && index === currentQuestion.answer_index && styles.radioButtonInnerCorrect,
                      state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.answer_index && styles.radioButtonInnerIncorrect
                    ]} />
                  )}
                </View>
                <Typography 
                  variant="bodyMedium" 
                  style={{
                    ...styles.optionText,
                    ...(state.showExplanation && index === currentQuestion.answer_index && styles.optionTextCorrect),
                    ...(state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.answer_index && styles.optionTextIncorrect)
                  }}
                >
                  {option}
                </Typography>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Explanation */}
        {state.showExplanation && (
          <Card style={styles.explanationCard}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultIcon, isCorrect ? styles.correctIcon : styles.incorrectIcon]}>
                {isCorrect ? '✅' : '❌'}
              </Text>
              <Typography 
                variant="titleMedium" 
                style={{
                  ...styles.resultText,
                  ...(isCorrect ? styles.correctText : styles.incorrectText)
                }}
              >
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </Typography>
            </View>
            
            <View style={styles.explanationContent}>
              <Typography variant="titleMedium" style={styles.explanationTitle}>
                Explanation
              </Typography>
              <Typography variant="bodyMedium" style={styles.explanationText}>
                {currentQuestion.rationale}
              </Typography>
            </View>
          </Card>
        )}
      </ScrollView>

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
          style={[styles.navButton, state.currentIndex === totalQuestions - 1 && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={state.currentIndex === totalQuestions - 1}
        >
          <Typography variant="bodyMedium" style={state.currentIndex === totalQuestions - 1 ? styles.navTextDisabled : styles.navText}>
            Next
          </Typography>
          <Text style={state.currentIndex === totalQuestions - 1 ? styles.navIconDisabled : styles.navIcon}>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: tokens.spacing.xl,
    paddingBottom: 0,
  },
  questionCard: {
    marginBottom: tokens.spacing.xl,
    padding: tokens.spacing.xl,
  },
  questionLabel: {
    color: tokens.colors.primary,
    fontWeight: '500',
    marginBottom: tokens.spacing.md,
  },
  questionText: {
    color: tokens.colors.onSurface,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: tokens.spacing.xl,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: tokens.colors.outlineVariant,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
  },
  selectedOption: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.surface,
  },
  correctOption: {
    borderColor: tokens.colors.success,
    backgroundColor: tokens.colors.successBg,
  },
  incorrectOption: {
    borderColor: tokens.colors.error,
    backgroundColor: '#ffebee',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tokens.colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  radioButtonSelected: {
    borderColor: tokens.colors.primary,
  },
  radioButtonCorrect: {
    borderColor: tokens.colors.success,
  },
  radioButtonIncorrect: {
    borderColor: tokens.colors.error,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.primary,
  },
  radioButtonInnerCorrect: {
    backgroundColor: tokens.colors.success,
  },
  radioButtonInnerIncorrect: {
    backgroundColor: tokens.colors.error,
  },
  optionText: {
    flex: 1,
    color: tokens.colors.onSurface,
    lineHeight: 20,
  },
  optionTextCorrect: {
    color: tokens.colors.successText,
  },
  optionTextIncorrect: {
    color: tokens.colors.error,
  },
  explanationCard: {
    backgroundColor: tokens.colors.lightGray,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  resultIcon: {
    fontSize: 20,
  },
  correctIcon: {
    // No additional styling needed
  },
  incorrectIcon: {
    // No additional styling needed
  },
  resultText: {
    fontWeight: '500',
  },
  correctText: {
    color: tokens.colors.success,
  },
  incorrectText: {
    color: tokens.colors.error,
  },
  explanationContent: {
    gap: tokens.spacing.md,
  },
  explanationTitle: {
    color: tokens.colors.onSurface,
    fontWeight: '500',
  },
  explanationText: {
    color: tokens.colors.onSurfaceVariant,
    lineHeight: 21,
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
    fontSize: 24,
    color: tokens.colors.onSurfaceVariant,
    fontWeight: 'bold',
  },
  navText: {
    color: 'white',
    fontWeight: '500',
  },
  navTextDisabled: {
    color: tokens.colors.onSurfaceVariant,
  },
});
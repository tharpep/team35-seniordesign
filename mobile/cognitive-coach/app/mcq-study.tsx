import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Typography, Card } from '../components/ui';
import { tokens } from '../styles/theme';
import { materialsService, Material, MultipleChoiceContent } from '../services/materials.service';

interface MCQState {
  currentIndex: number;
  selectedAnswer: number | null;
  showExplanation: boolean;
}

interface MCQData {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export default function MCQStudy() {
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  
  const [state, setState] = useState<MCQState>({
    currentIndex: 0,
    selectedAnswer: null,
    showExplanation: false,
  });
  const [questions, setQuestions] = useState<MCQData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch MCQ questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!sessionId) {
        Alert.alert('Error', 'No session ID provided');
        router.back();
        return;
      }

      setIsLoading(true);
      try {
        const response = await materialsService.getMaterialsBySession(Number(sessionId));
        if (response.data?.materials) {
          const mcqMaterials = response.data.materials
            .filter(m => m.type === 'multiple_choice')
            .map(material => {
              const content = materialsService.parseContent<MultipleChoiceContent>(material);
              if (typeof content !== 'string') {
                return {
                  question: content.question || 'No question available',
                  options: content.options || [],
                  correct: content.correct ?? 0,
                  explanation: (content as any).explanation
                };
              }
              return null;
            })
            .filter((q): q is MCQData => q !== null);

          if (mcqMaterials.length === 0) {
            Alert.alert('No Questions', 'No multiple choice questions found for this session.');
            router.back();
            return;
          }

          setQuestions(mcqMaterials);
        }
      } catch (error: any) {
        console.error('Error fetching MCQ questions:', error);
        Alert.alert('Error', 'Failed to load questions');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [sessionId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Typography variant="bodyMedium" style={{ marginTop: tokens.spacing.md }}>
            Loading questions...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

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

  const isCorrect = state.selectedAnswer === currentQuestion?.correct;

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Typography variant="titleMedium" style={styles.headerTitle}>
          Multiple Choice • {state.currentIndex + 1} of {totalQuestions}
        </Typography>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Question */}
        <Card style={styles.questionCard}>
          <Typography variant="titleMedium" style={styles.questionLabel}>
            Question
          </Typography>
          <Typography variant="bodyLarge" style={styles.questionText}>
            {currentQuestion.question}
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
                state.showExplanation && index === currentQuestion.correct && styles.correctOption,
                state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.correct && styles.incorrectOption
              ]}
              onPress={() => !state.showExplanation && handleAnswerSelect(index)}
              disabled={state.showExplanation}
              activeOpacity={state.showExplanation ? 1 : 0.7}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.radioButton,
                  state.selectedAnswer === index && styles.radioButtonSelected,
                  state.showExplanation && index === currentQuestion.correct && styles.radioButtonCorrect,
                  state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.correct && styles.radioButtonIncorrect
                ]}>
                  {state.selectedAnswer === index && (
                    <View style={[
                      styles.radioButtonInner,
                      state.showExplanation && index === currentQuestion.correct && styles.radioButtonInnerCorrect,
                      state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.correct && styles.radioButtonInnerIncorrect
                    ]} />
                  )}
                </View>
                <Typography 
                  variant="bodyMedium" 
                  style={{
                    ...styles.optionText,
                    ...(state.showExplanation && index === currentQuestion.correct && styles.optionTextCorrect),
                    ...(state.showExplanation && state.selectedAnswer === index && index !== currentQuestion.correct && styles.optionTextIncorrect)
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
                {currentQuestion.explanation || 'No explanation available'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.outline,
    backgroundColor: tokens.colors.surface,
  },
  backButton: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: tokens.colors.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontWeight: '500',
    color: tokens.colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
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
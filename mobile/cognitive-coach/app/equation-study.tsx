import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Typography, Card } from '../components/ui';
import { tokens } from '../styles/theme';
import { materialsService, Material, EquationContent } from '../services/materials.service';

interface Equation {
  title: string;
  formula: string;
  description: string;
  variables?: Record<string, string>;
}

interface EquationState {
  currentIndex: number;
}

export default function EquationStudy() {
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  
  const [state, setState] = useState<EquationState>({
    currentIndex: 0,
  });
  const [equations, setEquations] = useState<Equation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch equations from API
  useEffect(() => {
    const fetchEquations = async () => {
      if (!sessionId) {
        Alert.alert('Error', 'No session ID provided');
        router.back();
        return;
      }

      setIsLoading(true);
      try {
        const response = await materialsService.getMaterialsBySession(Number(sessionId));
        if (response.data?.materials) {
          const equationMaterials = response.data.materials
            .filter(m => m.type === 'equation')
            .map(material => {
              const content = materialsService.parseContent<EquationContent>(material);
              if (typeof content !== 'string') {
                return {
                  title: material.title || 'Equation',
                  formula: content.formula || 'No formula available',
                  description: content.description || 'No description available',
                  variables: content.variables
                };
              }
              return null;
            })
            .filter((eq): eq is Equation => eq !== null);

          if (equationMaterials.length === 0) {
            Alert.alert('No Equations', 'No equations found for this session.');
            router.back();
            return;
          }

          setEquations(equationMaterials);
        }
      } catch (error: any) {
        console.error('Error fetching equations:', error);
        Alert.alert('Error', 'Failed to load equations');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquations();
  }, [sessionId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Typography variant="bodyMedium" style={{ marginTop: tokens.spacing.md }}>
            Loading equations...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  const totalEquations = equations.length;
  const currentEquation = equations[state.currentIndex];

  const handlePrevious = () => {
    if (state.currentIndex > 0) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
      }));
    }
  };

  const handleNext = () => {
    if (state.currentIndex < totalEquations - 1) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
      }));
    }
  };

  if (!currentEquation) {
    return (
      <SafeAreaView style={styles.container}>
        <Typography variant="bodyLarge">No equations available</Typography>
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
          Equations • {state.currentIndex + 1} of {totalEquations}
        </Typography>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Equation Display */}
        <View style={styles.equationContainer}>
          <View style={styles.equationTitle}>
            <Typography variant="headlineSmall" style={styles.titleText}>
              {currentEquation.title}
            </Typography>
          </View>
          
          <Card style={styles.equationCard}>
            <Text style={styles.equationContent}>
              {currentEquation.formula}
            </Text>
          </Card>

          <View style={styles.descriptionContainer}>
            <Typography variant="bodyLarge" style={styles.descriptionText}>
              {currentEquation.description}
            </Typography>
          </View>

          {/* Variables Section (if available) */}
          {currentEquation.variables && Object.keys(currentEquation.variables).length > 0 && (
            <Card style={styles.variablesCard}>
              <Typography variant="titleMedium" style={styles.variablesTitle}>
                Variables
              </Typography>
              {Object.entries(currentEquation.variables).map(([key, value]) => (
                <View key={key} style={styles.variableRow}>
                  <Typography variant="bodyMedium" style={styles.variableKey}>
                    {key}:
                  </Typography>
                  <Typography variant="bodyMedium" style={styles.variableValue}>
                    {value}
                  </Typography>
                </View>
              ))}
            </Card>
          )}
        </View>
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
          style={[styles.navButton, state.currentIndex === totalEquations - 1 && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={state.currentIndex === totalEquations - 1}
        >
          <Typography variant="bodyMedium" style={state.currentIndex === totalEquations - 1 ? styles.navTextDisabled : styles.navText}>
            Next
          </Typography>
          <Text style={state.currentIndex === totalEquations - 1 ? styles.navIconDisabled : styles.navIcon}>
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
    backgroundColor: tokens.colors.background,
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
  equationContainer: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xxl,
  },
  equationTitle: {
    marginBottom: tokens.spacing.xl,
  },
  titleText: {
    color: tokens.colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  equationCard: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 2,
    borderColor: tokens.colors.successBorder,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xxl,
    marginBottom: tokens.spacing.xl,
    minWidth: '90%',
    alignItems: 'center',
  },
  equationContent: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: tokens.colors.onSurface,
    lineHeight: 28,
    textAlign: 'center',
  },
  descriptionContainer: {
    paddingHorizontal: tokens.spacing.lg,
    maxWidth: '100%',
  },
  descriptionText: {
    color: tokens.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
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
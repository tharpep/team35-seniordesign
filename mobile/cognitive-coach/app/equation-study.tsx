import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card } from '../components/ui';
import { tokens } from '../styles/theme';

interface Equation {
  id: string;
  title: string;
  preview: string;
  content: string;
  description: string;
}

interface EquationState {
  currentIndex: number;
}

const equations: Equation[] = [
  {
    id: 'eq1',
    title: 'Henderson-Hasselbalch Equation',
    preview: 'pH = pKa + log([A⁻]/[HA])',
    content: 'pH = pKa + log([A⁻]/[HA])',
    description: 'Used to calculate the pH of buffer solutions'
  },
  {
    id: 'eq2', 
    title: 'Arrhenius Equation',
    preview: 'k = Ae^(-Ea/RT)',
    content: 'k = Ae^(-Ea/RT)',
    description: 'Describes the temperature dependence of reaction rates'
  },
  {
    id: 'eq3',
    title: 'Beer-Lambert Law',
    preview: 'A = εbc',
    content: 'A = εbc',
    description: 'Relates the absorption of light to the properties of the material'
  },
  {
    id: 'eq4',
    title: 'Markovnikov Addition',
    preview: 'R₂C=CH₂ + HX → R₂CH-CH₂X',
    content: 'R₂C=CH₂ + HX → R₂CH-CH₂X',
    description: 'In the addition of HX to alkenes, the hydrogen adds to the carbon with more hydrogens'
  },
  {
    id: 'eq5',
    title: 'E2 Elimination',
    preview: 'R₃C-CHR-X + Base → R₂C=CR + HX + Base-H⁺',
    content: 'R₃C-CHR-X + Base → R₂C=CR + HX + Base-H⁺',
    description: 'Bimolecular elimination reaction mechanism for forming alkenes'
  },
  {
    id: 'eq6',
    title: 'Ozonolysis',
    preview: 'R₂C=CR₂ + O₃ → R₂C=O + O=CR₂',
    content: 'R₂C=CR₂ + O₃ → R₂C=O + O=CR₂',
    description: 'Oxidative cleavage of alkenes using ozone to form carbonyl compounds'
  }
];

export default function EquationStudy() {
  const [state, setState] = useState<EquationState>({
    currentIndex: 0,
  });

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
        <Typography variant="titleMedium" style={styles.headerTitle}>
          Equations • {state.currentIndex + 1} of {totalEquations}
        </Typography>
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
              {currentEquation.content}
            </Text>
          </Card>

          <View style={styles.descriptionContainer}>
            <Typography variant="bodyLarge" style={styles.descriptionText}>
              {currentEquation.description}
            </Typography>
          </View>
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
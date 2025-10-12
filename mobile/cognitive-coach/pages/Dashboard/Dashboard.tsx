import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card } from '../../components/ui';
import { commonStyles, tokens } from '../../styles/theme';

interface Session {
  id: string;
  title: string;
  date: string;
  duration: string;
  focusScore: number;
  emotion: string;
  artifacts: {
    equations?: number;
    flashcards?: number;
    questions?: number;
  };
}

export default function Dashboard() {
  const sessions: Session[] = [
    {
      id: '1',
      title: 'Organic Chemistry Review',
      date: 'Today, 2:30 PM',
      duration: '2h 15m',
      focusScore: 88,
      emotion: 'Focused',
      artifacts: { equations: 12, flashcards: 15, questions: 3 }
    },
    {
      id: '2',
      title: 'Calculus Problem Solving',
      date: 'Yesterday, 7:45 PM',
      duration: '1h 45m',
      focusScore: 92,
      emotion: 'Confident',
      artifacts: { equations: 18, flashcards: 15, questions: 2 }
    },
    {
      id: '3',
      title: 'World History Reading',
      date: '2 days ago, 3:15 PM',
      duration: '3h 20m',
      focusScore: 76,
      emotion: 'Calm',
      artifacts: { flashcards: 18, questions: 5 }
    },
    {
      id: '4',
      title: 'Physics Lab Analysis',  
      date: '3 days ago, 1:00 PM',
      duration: '2h 50m',
      focusScore: 94,
      emotion: 'Engaged',
      artifacts: { equations: 8, flashcards: 9, questions: 4 }
    }
  ];

  const handleSessionClick = (sessionId: string) => {
    router.push('/session');
  };

  const handleProfilePress = () => {
    Alert.alert('Profile', 'Profile functionality would be implemented here.');
  };

  const handleNotificationsPress = () => {
    Alert.alert('Notifications', 'No new notifications.');
  };

  const renderArtifacts = (artifacts: Session['artifacts']) => {
    const items = [];
    if (artifacts.equations) {
      items.push(
        <View key="equations" style={[styles.artifactChip, styles.artifactChipEquation]}>
          <Text style={styles.artifactIcon}>⚡</Text>
          <Text style={[styles.artifactText, styles.artifactTextEquation]}>
            {artifacts.equations} equations
          </Text>
        </View>
      );
    }
    if (artifacts.flashcards) {
      items.push(
        <View key="flashcards" style={[styles.artifactChip, styles.artifactChipFlashcard]}>
          <Text style={styles.artifactIcon}>📚</Text>
          <Text style={[styles.artifactText, styles.artifactTextFlashcard]}>
            {artifacts.flashcards} flashcards
          </Text>
        </View>
      );
    }
    if (artifacts.questions) {
      items.push(
        <View key="questions" style={[styles.artifactChip, styles.artifactChipQuestion]}>
          <Text style={styles.artifactIcon}>❓</Text>
          <Text style={[styles.artifactText, styles.artifactTextQuestion]}>
            {artifacts.questions} questions
          </Text>
        </View>
      );
    }
    return items;
  };

  return (
    <View style={commonStyles.container}>
      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <View style={styles.headerTop}>
          <View style={styles.brandSection}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>🧠</Text>
            </View>
            <Typography variant="titleLarge" style={{ fontWeight: '500' }}>
              Study Coach
            </Typography>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleNotificationsPress}>
              <Text style={styles.headerButtonIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
              <Text style={styles.profileText}>JD</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Typography variant="bodyLarge" color="secondary" style={{ marginTop: tokens.spacing.sm }}>
          Welcome back! Here's your study progress.
        </Typography>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: tokens.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Previous Sessions Section */}
        <View style={styles.sessionsSection}>
          <Typography variant="titleLarge" style={styles.sectionTitle}>
            Previous sessions
          </Typography>
          
          {sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => handleSessionClick(session.id)}
              activeOpacity={0.7}
            >
              <Card style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Typography variant="titleMedium" style={styles.sessionTitle}>
                      {session.title}
                    </Typography>
                    <Typography variant="bodySmall" color="secondary" style={styles.sessionDate}>
                      {session.date}
                    </Typography>
                  </View>
                  <Typography variant="bodyMedium" style={styles.sessionDuration}>
                    {session.duration}
                  </Typography>
                </View>

                <View style={styles.sessionMetrics}>
                  <View style={styles.focusScoreContainer}>
                    <Typography variant="bodyMedium" style={styles.focusScore}>
                      Focus: {session.focusScore}%
                    </Typography>
                    <Typography variant="bodyMedium" color="link" style={styles.emotion}>
                      Emotion: {session.emotion}
                    </Typography>
                  </View>
                </View>

                <View style={styles.sessionArtifacts}>
                  {renderArtifacts(session.artifacts)}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  mobileHeader: {
    backgroundColor: tokens.colors.surface,
    paddingTop: 60,
    paddingHorizontal: tokens.spacing.xl,
    paddingBottom: tokens.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.outline,
    ...tokens.shadows.sm,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  brandSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: tokens.spacing.md,
  },
  brandIcon: {
    width: 36,
    height: 36,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  brandIconText: {
    fontSize: 18,
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: tokens.spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(95, 99, 104, 0.1)',
  },
  headerButtonIcon: {
    fontSize: 18,
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  profileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  sessionsSection: {
    padding: tokens.spacing.xl,
  },
  sectionTitle: {
    marginBottom: tokens.spacing.lg,
    fontWeight: '500' as const,
  },
  sessionCard: {
    marginBottom: tokens.spacing.lg,
  },
  sessionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: tokens.spacing.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    marginBottom: tokens.spacing.xs,
  },
  sessionDate: {
    // No additional styles needed, handled by Typography
  },
  sessionDuration: {
    backgroundColor: '#e8f0fe',
    color: tokens.colors.primary,
    fontWeight: '500' as const,
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    fontSize: 12,
  },
  sessionMetrics: {
    marginBottom: tokens.spacing.md,
  },
  focusScoreContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: tokens.spacing.lg,
  },
  focusScore: {
    fontWeight: '500' as const,
    color: '#34a853',
  },
  emotion: {
    fontWeight: '500' as const,
  },
  sessionArtifacts: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: tokens.spacing.sm,
  },
  artifactChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.xs,
    borderWidth: 1,
    backgroundColor: '#f1f3f4',
    borderColor: tokens.colors.outlineVariant,
  },
  artifactChipEquation: {
    backgroundColor: '#e8f5e8',
    borderColor: '#c8e6c9',
  },
  artifactChipFlashcard: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffcc02',
  },
  artifactChipQuestion: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  artifactIcon: {
    fontSize: 12,
  },
  artifactText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#3c4043',
  },
  artifactTextEquation: {
    color: '#2e7d32',
  },
  artifactTextFlashcard: {
    color: '#e65100',
  },
  artifactTextQuestion: {
    color: '#1565c0',
  },
};
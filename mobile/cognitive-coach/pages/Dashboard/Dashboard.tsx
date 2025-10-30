import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card } from '../../components/ui';
import { commonStyles, tokens } from '../../styles/theme';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { sessionService, Session as BackendSession } from '../../services/session.service';

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

function DashboardContent() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await sessionService.getAllSessions();

      if (response.error || !response.data) {
        Alert.alert('Error', response.message || 'Failed to load sessions');
        return;
      }

      // Transform backend sessions to display format
      const transformedSessions: Session[] = response.data.sessions.map((session: BackendSession) => ({
        id: session.id.toString(),
        title: session.title,
        date: sessionService.formatSessionDate(session.start_time),
        duration: sessionService.formatDuration(session.duration),
        focusScore: session.focus_score || 0,
        emotion: session.status === 'completed' ? 'Focused' : 'In Progress',
        artifacts: {
          // Note: Artifacts count will be added when we integrate materials
          flashcards: 0,
          equations: 0,
          questions: 0
        }
      }));

      setSessions(transformedSessions);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSessions();
    setIsRefreshing(false);
  };

  const handleSessionClick = (sessionId: string) => {
    router.push({
      pathname: '/session',
      params: { id: sessionId }
    });
  };

  const handleProfilePress = () => {
    router.push('/profile');
  };

  const handleNotificationsPress = () => {
    Alert.alert('Notifications', 'No new notifications.');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  // Get user initials for profile button
  const getUserInitials = () => {
    if (!user) return 'U';
    const firstInitial = user.first_name?.charAt(0).toUpperCase() || '';
    const lastInitial = user.last_name?.charAt(0).toUpperCase() || '';
    return firstInitial && lastInitial ? `${firstInitial}${lastInitial}` : user.email.charAt(0).toUpperCase();
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
              <Text style={styles.profileText}>{getUserInitials()}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Typography variant="bodyLarge" color="secondary" style={{ marginTop: tokens.spacing.sm }}>
          Welcome back{user?.first_name ? `, ${user.first_name}` : ''}! Here's your study progress.
        </Typography>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: tokens.spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.colors.primary}
          />
        }
      >
        {/* Previous Sessions Section */}
        <View style={styles.sessionsSection}>
          <Typography variant="titleLarge" style={styles.sectionTitle}>
            Previous sessions
          </Typography>
          
          {isLoading ? (
            <View style={{ padding: tokens.spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={tokens.colors.primary} />
              <Typography variant="bodyMedium" color="secondary" style={{ marginTop: tokens.spacing.md }}>
                Loading sessions...
              </Typography>
            </View>
          ) : sessions.length === 0 ? (
            <Card style={styles.sessionCard}>
              <View style={{ padding: tokens.spacing.lg, alignItems: 'center' }}>
                <Text style={{ fontSize: 48, marginBottom: tokens.spacing.md }}>📚</Text>
                <Typography variant="titleMedium" style={{ marginBottom: tokens.spacing.sm }}>
                  No sessions yet
                </Typography>
                <Typography variant="bodyMedium" color="secondary" style={{ textAlign: 'center' }}>
                  Your study sessions will appear here once you create them on the web app.
                </Typography>
              </View>
            </Card>
          ) : (
            sessions.map((session) => (
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
            ))
          )}
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
    fontWeight: '400' as const,
    fontSize: 24,
    color: tokens.colors.onSurface,
  },
  sessionCard: {
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.sm,
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
    fontSize: 18,
    fontWeight: '500' as const,
    color: tokens.colors.onSurface,
  },
  sessionDate: {
    // No additional styles needed, handled by Typography
  },
  sessionDuration: {
    backgroundColor: tokens.colors.durationBg,
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
    color: tokens.colors.success,
    fontSize: 18,
  },
  emotion: {
    fontWeight: '500' as const,
    fontSize: 18,
    color: tokens.colors.emotionBlue,
    marginLeft: 16,
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
    backgroundColor: tokens.colors.artifactDefault,
    borderColor: tokens.colors.artifactDefaultBorder,
  },
  artifactChipEquation: {
    backgroundColor: tokens.colors.successBg,
    borderColor: tokens.colors.successBorder,
  },
  artifactChipFlashcard: {
    backgroundColor: tokens.colors.flashcardBg,
    borderColor: tokens.colors.flashcardBorder,
  },
  artifactChipQuestion: {
    backgroundColor: tokens.colors.questionBg,
    borderColor: tokens.colors.questionBorder,
  },
  artifactIcon: {
    fontSize: 12,
  },
  artifactText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: tokens.colors.artifactDefaultText,
  },
  artifactTextEquation: {
    color: tokens.colors.successText,
  },
  artifactTextFlashcard: {
    color: tokens.colors.flashcardText,
  },
  artifactTextQuestion: {
    color: tokens.colors.questionText,
  },
};

// Wrap with ProtectedRoute
export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
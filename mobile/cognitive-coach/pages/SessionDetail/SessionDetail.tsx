import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Typography, Card, Button } from '../../components/ui';
import { commonStyles, tokens } from '../../styles/theme';
import StudyArtifacts from '../../components/StudyArtifacts/StudyArtifacts';
import { sessionService, materialsService, genaiService } from '../../services';
import type { Material, InsightContent } from '../../services/materials.service';
import type { Session } from '../../services/session.service';

interface TimelineEvent {
  time: string;
  title: string;
  description: string;
}

interface Insight {
  title: string;
  description: string;
  icon: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function SessionDetail() {
  const params = useLocalSearchParams();
  const sessionId = params.id as string;
  
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      text: "Hi! I can help answer questions about your session. Ask me anything about the topics you covered, clarify concepts, or get additional practice problems!",
      timestamp: 'Just now'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesRef = useRef<ScrollView>(null);

  // Data state
  const [sessionData, setSessionData] = useState<any>(null);
  const [rawSession, setRawSession] = useState<Session | null>(null);
  const [artifacts, setArtifacts] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);

  // Fetch session data and artifacts
  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        Alert.alert('Error', 'No session ID provided');
        router.back();
        return;
      }

      setIsLoading(true);
      try {
        // Fetch session data and artifacts in parallel
        const [sessionResponse, artifactsResponse] = await Promise.all([
          sessionService.getSessionById(Number(sessionId)),
          materialsService.getMaterialsBySession(Number(sessionId))
        ]);

        // Handle session data
        if (sessionResponse.data?.session) {
          const session = sessionResponse.data.session;
          setRawSession(session);

          // Format session data for display
          const startTime = session.start_time ? new Date(session.start_time) : null;
          const endTime = session.end_time ? new Date(session.end_time) : null;
          const durationMinutes = session.duration || 0;
          const durationHours = Math.floor(durationMinutes / 60);
          const durationMins = durationMinutes % 60;
          const durationStr = durationHours > 0 
            ? `${durationHours}h ${durationMins}m` 
            : `${durationMins}m`;

          setSessionData({
            title: session.title || 'Untitled Session',
            date: startTime && endTime 
              ? `${startTime.toLocaleDateString()}, ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : startTime 
                ? `${startTime.toLocaleDateString()}, ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Unknown date',
            duration: durationStr,
            sessionId: '#' + sessionId,
            status: sessionService.getStatusDisplay(session.status),
            metrics: {
              focusScore: session.focus_score ? Math.round(session.focus_score) : null,
              emotion: "focused",
              artifacts: artifactsResponse.data?.materials?.length || 0
            }
          });
        } else {
          throw new Error('Session not found');
        }

        // Handle artifacts
        if (artifactsResponse.data?.materials) {
          const materials = artifactsResponse.data.materials;
          setArtifacts(materials);

          // Parse insights from materials
          const insightMaterials = materials
            .filter(m => m.type === 'insights')
            .flatMap((material, artifactIndex) => {
              try {
                const content = materialsService.parseContent<InsightContent>(material);
                if (typeof content !== 'string' && content.insights && Array.isArray(content.insights)) {
                  return content.insights.map((insight, insightIndex) => ({
                    title: insight.title,
                    description: insight.takeaway,
                    icon: (artifactIndex + insightIndex) === 0 ? '📈' : 
                          (artifactIndex + insightIndex) === 1 ? '🧠' : '⚖️'
                  }));
                }
                return [];
              } catch (error) {
                console.error('Error parsing insight:', error);
                return [];
              }
            })
            .slice(0, 3);

          setInsights(insightMaterials);
        }
      } catch (error: any) {
        console.error('Error fetching session data:', error);
        Alert.alert('Error', error.message || 'Failed to load session data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const timelineEvents: TimelineEvent[] = [
    { time: '2:30', title: 'Session Started', description: 'All cameras initialized' },
    { time: '2:45', title: 'High Focus Period', description: '95% focus on alkene reactions' },
    { time: '3:20', title: 'Break Detected', description: '5 minute study break' },
    { time: '4:10', title: 'Focus Dip', description: 'Attention decreased to 65%' },
    { time: '4:45', title: 'Session Ended', description: 'Review completed' }
  ];

  // Clear chat session when component unmounts
  useEffect(() => {
    return () => {
      genaiService.clearChatSession('global').catch(error => {
        console.warn('Failed to clear chat session on unmount:', error);
      });
    };
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollToEnd({ animated: true });
    }
  }, [chatHistory, isTyping]);

  // Real AI chat handler
  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: chatMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMessage]);
    const messageToSend = chatMessage;
    setChatMessage('');
    setIsTyping(true);

    try {
      // Build session context from raw session data
      const sessionContext = rawSession ? {
        session_id: rawSession.id,
        session_title: rawSession.title,
        session_topic: rawSession.context || undefined,
        start_time: rawSession.start_time,
        end_time: rawSession.end_time || undefined,
        duration: rawSession.duration || undefined,
        status: rawSession.status,
        created_at: rawSession.created_at,
        focus_score: rawSession.focus_score
      } : undefined;

      // Call gen-ai API directly (bypasses backend)
      const response = await genaiService.chat(
        messageToSend,
        sessionId || 'global',
        sessionContext
      );

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, aiResponse]);
    } catch (error: any) {
      console.error('Chat error:', error);

      // Show error message to user
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: error.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleSuggestedQuestion = (question: string) => {
    setChatMessage(question);
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <Typography variant="bodyMedium" style={{ marginTop: tokens.spacing.md }}>
          Loading session...
        </Typography>
      </View>
    );
  }

  // Show error state if no session data
  if (!sessionData) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center', padding: tokens.spacing.xl }]}>
        <Typography variant="headlineSmall" style={{ marginBottom: tokens.spacing.md }}>
          Session Not Found
        </Typography>
        <Button variant="primary" onPress={handleBackToDashboard}>
          Back to Dashboard
        </Button>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBackToDashboard} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Dashboard</Text>
          </TouchableOpacity>
          <Typography variant="bodySmall" color="secondary">Session Details</Typography>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: tokens.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Header Card */}
        <Card variant="large" style={styles.sessionHeaderCard}>
          <Typography variant="headlineSmall" style={styles.sessionTitle}>
            {sessionData.title}
          </Typography>
          
          <View style={styles.sessionMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🕒</Text>
              <Typography variant="bodySmall" color="secondary">
                {sessionData.date}
              </Typography>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Typography variant="bodySmall" color="secondary">
                {sessionData.duration}
              </Typography>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🏷️</Text>
              <Typography variant="bodySmall" color="secondary">
                Session {sessionData.sessionId}
              </Typography>
            </View>
          </View>

          {/* Session Overview Metrics */}
          <View style={styles.overviewMetrics}>
            <View style={styles.overviewMetric}>
              <Typography variant="titleLarge" style={styles.focusValue}>
                {sessionData.metrics.focusScore !== null ? `${sessionData.metrics.focusScore}%` : 'N/A'}
              </Typography>
              <Typography variant="bodySmall" color="secondary">
                Focus Score
              </Typography>
            </View>
            <View style={styles.overviewMetric}>
              <Typography variant="titleLarge" style={styles.emotionValue}>
                {sessionData.metrics.emotion.charAt(0).toUpperCase() + sessionData.metrics.emotion.slice(1)}
              </Typography>
              <Typography variant="bodySmall" color="secondary">
                Emotion
              </Typography>
            </View>
            <View style={styles.overviewMetric}>
              <Typography variant="titleLarge" style={styles.artifactsValue}>
                {sessionData.metrics.artifacts}
              </Typography>
              <Typography variant="bodySmall" color="secondary">
                Study Artifacts
              </Typography>
            </View>
          </View>
        </Card>

        {/* Study Artifacts Section */}
        <StudyArtifacts sessionId={sessionId} artifacts={artifacts} />

        {/* AI Chat Section */}
        <Card style={styles.chatSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🤖</Text>
            <Typography variant="titleMedium" style={styles.sectionTitle}>
              Ask AI About This Session
            </Typography>
          </View>

          <View style={styles.chatContainer}>
            <ScrollView 
              ref={chatMessagesRef}
              style={styles.chatMessages}
              contentContainerStyle={{ paddingBottom: tokens.spacing.md }}
            >
              {chatHistory.map((message) => (
                <View key={message.id} style={styles.messageWrapper}>
                  <View style={[
                    styles.messageAvatar,
                    message.type === 'ai' ? styles.aiAvatar : styles.userAvatar
                  ]}>
                    <Typography variant="bodySmall" style={styles.avatarText}>
                      {message.type === 'ai' ? 'AI' : 'You'}
                    </Typography>
                  </View>
                  <View style={[
                    styles.messageContent,
                    message.type === 'ai' ? styles.aiMessageContent : styles.userMessageContent
                  ]}>
                    <Typography variant="bodyMedium" style={styles.messageText}>
                      {message.text}
                    </Typography>
                    <Typography variant="bodySmall" color="secondary" style={styles.messageTime}>
                      {message.timestamp}
                    </Typography>
                  </View>
                </View>
              ))}
              {isTyping && (
                <View style={styles.messageWrapper}>
                  <View style={[styles.messageAvatar, styles.aiAvatar]}>
                    <Typography variant="bodySmall" style={styles.avatarText}>AI</Typography>
                  </View>
                  <View style={[styles.messageContent, styles.aiMessageContent]}>
                    <View style={styles.typingIndicator}>
                      <View style={styles.typingDot} />
                      <View style={styles.typingDot} />
                      <View style={styles.typingDot} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Suggested Questions */}
            <View style={styles.suggestedQuestions}>
              <TouchableOpacity 
                style={styles.suggestionBtn}
                onPress={() => handleSuggestedQuestion("What topics did I cover in this session?")}
              >
                <Typography variant="bodySmall" style={styles.suggestionText}>
                  What topics did I cover?
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.suggestionBtn}
                onPress={() => handleSuggestedQuestion("Create a practice problem based on this session")}
              >
                <Typography variant="bodySmall" style={styles.suggestionText}>
                  Create a practice problem
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.suggestionBtn}
                onPress={() => handleSuggestedQuestion("What are common mistakes in these topics?")}
              >
                <Typography variant="bodySmall" style={styles.suggestionText}>
                  What are common mistakes?
                </Typography>
              </TouchableOpacity>
            </View>

            {/* Chat Input */}
            <View style={styles.chatInputWrapper}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask about your session..."
                value={chatMessage}
                onChangeText={setChatMessage}
                multiline
                placeholderTextColor={tokens.colors.onSurfaceVariant}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Text style={styles.sendButtonIcon}>📤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* AI Insights */}
        {insights.length > 0 && (
          <Card style={styles.insightsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💡</Text>
              <Typography variant="titleMedium" style={styles.sectionTitle}>
                AI Insights
              </Typography>
            </View>

            <View style={styles.insightsList}>
              {insights.map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightIcon}>{insight.icon}</Text>
                    <Typography variant="bodyMedium" style={styles.insightTitle}>
                      {insight.title}
                    </Typography>
                  </View>
                  <Typography variant="bodySmall" color="secondary" style={styles.insightDesc}>
                    {insight.description}
                  </Typography>
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileHeader: {
    backgroundColor: tokens.colors.surface,
    paddingTop: 60,
    paddingHorizontal: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.outline,
    ...tokens.shadows.sm,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  backButton: {
    // No additional styling needed
  },
  backButtonText: {
    color: tokens.colors.primary,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  sessionHeaderCard: {
    margin: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
  },
  sessionTitle: {
    marginBottom: tokens.spacing.md,
    fontWeight: '500' as const,
  },
  sessionMeta: {
    marginBottom: tokens.spacing.lg,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  metaIcon: {
    fontSize: 14,
  },

  overviewMetrics: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingTop: tokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.outline,
  },
  overviewMetric: {
    alignItems: 'center' as const,
  },
  metricValue: {
    fontWeight: '400' as const,
    marginBottom: tokens.spacing.xs,
    fontSize: 32,
    lineHeight: 32,
  },
  focusValue: {
    fontWeight: '400' as const,
    marginBottom: tokens.spacing.xs,
    lineHeight: 32,
    color: tokens.colors.success,
  },
  emotionValue: {
    fontWeight: '400' as const,
    marginBottom: tokens.spacing.xs,
    lineHeight: 32,
    color: tokens.colors.primary,
  },
  artifactsValue: {
    fontWeight: '400' as const,
    marginBottom: tokens.spacing.xs,
    lineHeight: 32,
    color: tokens.colors.warning,
  },
  chatSection: {
    marginHorizontal: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontWeight: '500' as const,
  },
  chatContainer: {
    backgroundColor: tokens.colors.lightGray,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    overflow: 'hidden' as const,
  },
  chatMessages: {
    maxHeight: 300,
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  messageWrapper: {
    flexDirection: 'row' as const,
    marginBottom: tokens.spacing.md,
    alignItems: 'flex-start' as const,
    gap: tokens.spacing.sm,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  aiAvatar: {
    backgroundColor: tokens.colors.primary,
  },
  userAvatar: {
    backgroundColor: tokens.colors.onSurfaceVariant,
  },
  avatarText: {
    color: 'white',
    fontWeight: '500' as const,
    fontSize: 10,
  },
  messageContent: {
    flex: 1,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
  },
  aiMessageContent: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
  },
  userMessageContent: {
    backgroundColor: tokens.colors.primary,
  },
  messageText: {
    color: tokens.colors.onSurface,
    marginBottom: tokens.spacing.xs,
  },
  messageTime: {
    // No additional styling needed
  },
  typingIndicator: {
    flexDirection: 'row' as const,
    gap: 4,
    alignItems: 'center' as const,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.onSurfaceVariant,
  },
  suggestedQuestions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  suggestionBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
  },
  suggestionText: {
    color: tokens.colors.primary,
  },
  chatInputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.outline,
    paddingTop: tokens.spacing.md,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    maxHeight: 100,
    color: tokens.colors.onSurface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sendButtonIcon: {
    fontSize: 18,
  },
  timelineSection: {
    marginHorizontal: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
  },
  timeline: {
    // No additional styling needed
  },
  timelineItem: {
    flexDirection: 'row' as const,
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.lightGray,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    borderLeftWidth: 4,
    borderLeftColor: tokens.colors.primary,
  },
  timelineTime: {
    width: 50,
    alignItems: 'center' as const,
  },
  timelineTimeText: {
    fontWeight: '500' as const,
    color: tokens.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: 'System' as const,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontWeight: '500' as const,
    marginBottom: tokens.spacing.xs,
  },
  timelineDesc: {
    // No additional styling needed
  },
  insightsSection: {
    marginHorizontal: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
  },
  insightsList: {
    // No additional styling needed
  },
  insightItem: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.successBg,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.successBorder,
  },
  insightHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  insightIcon: {
    fontSize: 16,
  },
  insightTitle: {
    fontWeight: '500' as const,
    color: tokens.colors.successText,
    fontSize: 14,
  },
  insightDesc: {
    lineHeight: 20,
    color: tokens.colors.successText,
    fontSize: 12,
    opacity: 0.8,
  },
});
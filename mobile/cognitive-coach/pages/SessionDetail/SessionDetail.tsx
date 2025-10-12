import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card, Button } from '../../components/ui';
import { commonStyles, tokens } from '../../styles/theme';
import StudyArtifacts from '../../components/StudyArtifacts/StudyArtifacts';

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
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      text: "Hi! I can help answer questions about your Organic Chemistry session. Ask me anything about the topics you covered, clarify concepts, or get additional practice problems!",
      timestamp: 'Just now'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesRef = useRef<ScrollView>(null);

  // Mock session data
  const sessionData = {
    title: 'Organic Chemistry Review',
    date: 'Today, 2:30 PM - 4:45 PM', 
    duration: '2h 15m',
    sessionId: '#2847',
    status: 'Completed',
    metrics: {
      focusScore: 88,
      emotion: "focused",
      artifacts: 15
    }
  };

  const timelineEvents: TimelineEvent[] = [
    { time: '2:30', title: 'Session Started', description: 'All cameras initialized' },
    { time: '2:45', title: 'High Focus Period', description: '95% focus on alkene reactions' },
    { time: '3:20', title: 'Break Detected', description: '5 minute study break' },
    { time: '4:10', title: 'Focus Dip', description: 'Attention decreased to 65%' },
    { time: '4:45', title: 'Session Ended', description: 'Review completed' }
  ];

  const insights: Insight[] = [
    {
      title: "Peak Performance Period",
      description: "Your focus was highest during alkene reactions (95% attention), suggesting this topic aligns well with your learning style.",
      icon: "📈"
    },
    {
      title: "Learning Pattern Detected", 
      description: "You learn best with step-by-step mechanisms. Break down complex topics into smaller, sequential parts.",
      icon: "🧠"
    },
    {
      title: "Optimal Study Duration",
      description: "Your attention drops after 90 minutes. Consider taking breaks every hour and a half for maximum retention.",
      icon: "⚖️"
    }
  ];

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollToEnd({ animated: true });
    }
  }, [chatHistory, isTyping]);

  // Mock AI responses based on keywords
  const getMockAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes("markovnikov")) {
      return "Markovnikov's rule states that in the addition of HX to an alkene, the hydrogen atom attaches to the carbon with the greater number of hydrogen atoms, while the halogen attaches to the carbon with fewer hydrogen atoms. This occurs because the reaction proceeds through the more stable carbocation intermediate.";
    } else if (message.includes("practice problem")) {
      return "Here's a practice problem: Draw the major product when 2-methyl-2-butene reacts with HBr. Remember to apply Markovnikov's rule! The answer would be 2-bromo-2-methylbutane, as the Br⁻ adds to the more substituted carbon.";
    } else if (message.includes("common mistakes") || message.includes("mistakes")) {
      return "Common mistakes in alkene reactions include: 1) Forgetting to consider carbocation stability, 2) Not applying Markovnikov's rule correctly, 3) Ignoring stereochemistry in addition reactions, and 4) Confusing syn vs anti addition mechanisms.";
    } else if (message.includes("focus") || message.includes("attention")) {
      return "I noticed your focus was highest during the alkene reactions section (around 3:00-3:20). This suggests you learn best when working with specific mechanisms. Try breaking down complex topics into step-by-step mechanisms like you did with those reactions!";
    } else {
      return "That's a great question! Based on your session, you showed strong understanding of reaction mechanisms. Could you be more specific about which aspect of organic chemistry you'd like me to explain? I can help with alkenes, stereochemistry, or any other topics you covered.";
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: chatMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message
    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: getMockAIResponse(chatMessage),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleSuggestedQuestion = (question: string) => {
    setChatMessage(question);
  };

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
                {sessionData.metrics.focusScore}%
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
        <StudyArtifacts />

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
                onPress={() => handleSuggestedQuestion("Explain Markovnikov's rule")}
              >
                <Typography variant="bodySmall" style={styles.suggestionText}>
                  Explain Markovnikov's rule
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.suggestionBtn}
                onPress={() => handleSuggestedQuestion("Create a practice problem")}
              >
                <Typography variant="bodySmall" style={styles.suggestionText}>
                  Create a practice problem
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.suggestionBtn}
                onPress={() => handleSuggestedQuestion("What are common mistakes?")}
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
                placeholder="Ask about alkenes, stereochemistry, reactions..."
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

        {/* Session Timeline */}
        <Card style={styles.timelineSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Typography variant="titleMedium" style={styles.sectionTitle}>
              Session Timeline
            </Typography>
          </View>

          <View style={styles.timeline}>
            {timelineEvents.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineTime}>
                  <Typography variant="bodySmall" style={styles.timelineTimeText}>
                    {event.time}
                  </Typography>
                </View>
                <View style={styles.timelineContent}>
                  <Typography variant="bodyMedium" style={styles.timelineTitle}>
                    {event.title}
                  </Typography>
                  <Typography variant="bodySmall" color="secondary" style={styles.timelineDesc}>
                    {event.description}
                  </Typography>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* AI Insights */}
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
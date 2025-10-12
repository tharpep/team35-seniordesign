import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';

export default function SessionDetail() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI study coach. How can I help you with your session today?", sender: 'ai' },
  ]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('artifacts');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user' as const,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Mock AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: "I understand you're working on this topic. Let me help you create some study materials.",
        sender: 'ai' as const,
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToDashboard} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Study Session</Text>
        <Text style={styles.subtitle}>Mathematics - 45 min</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'artifacts' && styles.activeTab]}
          onPress={() => setActiveTab('artifacts')}
        >
          <Text style={[styles.tabText, activeTab === 'artifacts' && styles.activeTabText]}>
            Study Artifacts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            AI Coach
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'artifacts' && (
        <ScrollView style={styles.artifactsContainer}>
          <View style={styles.artifactCard}>
            <Text style={styles.artifactTitle}>Generated Flashcards</Text>
            <Text style={styles.artifactCount}>12 cards</Text>
          </View>
          <View style={styles.artifactCard}>
            <Text style={styles.artifactTitle}>Practice Questions</Text>
            <Text style={styles.artifactCount}>8 questions</Text>
          </View>
          <View style={styles.artifactCard}>
            <Text style={styles.artifactTitle}>Key Insights</Text>
            <Text style={styles.artifactCount}>3 insights</Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'chat' && (
        <View style={styles.chatContainer}>
          <ScrollView style={styles.messagesContainer}>
            {messages.map((message) => (
              <View 
                key={message.id} 
                style={[
                  styles.messageContainer,
                  message.sender === 'user' ? styles.userMessage : styles.aiMessage
                ]}
              >
                <Text style={styles.messageText}>{message.text}</Text>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask your AI coach anything..."
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  artifactsContainer: {
    flex: 1,
    padding: 20,
  },
  artifactCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  artifactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  artifactCount: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#4A90E2',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
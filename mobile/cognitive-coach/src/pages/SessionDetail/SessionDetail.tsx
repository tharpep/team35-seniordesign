import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function SessionDetail() {
  const navigateBack = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session Detail</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sessionTitle}>Organic Chemistry Review</Text>
        <Text style={styles.sessionDate}>Today, 2:30 PM - 4:45 PM</Text>
        <Text style={styles.sessionDuration}>Duration: 2h 15m</Text>
        
        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>88%</Text>
            <Text style={styles.metricLabel}>Focus Score</Text>
          </View>
          
          <View style={styles.metric}>
            <Text style={styles.metricValue}>Focused</Text>
            <Text style={styles.metricLabel}>Emotion</Text>
          </View>
          
          <View style={styles.metric}>
            <Text style={styles.metricValue}>30</Text>
            <Text style={styles.metricLabel}>Study Artifacts</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Focus & Attention Analytics</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Focus chart will be implemented here</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Study Artifacts</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Study artifacts will be displayed here</Text>
        </View>
        
        <Text style={styles.sectionTitle}>AI Chat</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>AI chat interface will be implemented here</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    color: '#1a73e8',
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  sessionDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 20,
  },
  placeholder: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function Dashboard() {
  const handleSessionPress = () => {
    router.push('/session');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Dashboard</Text>
        <Text style={styles.subtitle}>Track your learning progress</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>42</Text>
          <Text style={styles.statLabel}>Flashcards</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>18</Text>
          <Text style={styles.statLabel}>MCQ</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>7</Text>
          <Text style={styles.statLabel}>Insights</Text>
        </View>
      </View>

      <View style={styles.sessionContainer}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <TouchableOpacity style={styles.sessionCard} onPress={handleSessionPress}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Mathematics Study</Text>
            <Text style={styles.sessionDate}>Today, 2:30 PM</Text>
          </View>
          <Text style={styles.sessionDuration}>45 min</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sessionCard} onPress={handleSessionPress}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Physics Review</Text>
            <Text style={styles.sessionDate}>Yesterday, 4:15 PM</Text>
          </View>
          <Text style={styles.sessionDuration}>30 min</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4A90E2',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sessionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sessionCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  sessionDate: {
    fontSize: 12,
    color: '#666',
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
});
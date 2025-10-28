import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Button } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { tokens } from '@/styles/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleBackPress = () => {
    router.back();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Text style={{ marginTop: tokens.spacing.md, color: tokens.colors.onSurface }}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {getInitials(user.first_name || '', user.last_name || '')}
            </Text>
          </View>
        </View>
        <Card style={styles.infoCard}>
          <ThemedText style={styles.cardTitle}>Personal Information</ThemedText>
          
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>FIRST NAME</Text>
            <ThemedText style={styles.fieldValue}>{user.first_name}</ThemedText>
          </View>

          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>LAST NAME</Text>
            <ThemedText style={styles.fieldValue}>{user.last_name}</ThemedText>
          </View>

          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <ThemedText style={styles.fieldValue}>{user.email}</ThemedText>
          </View>

          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>MEMBER SINCE</Text>
            <ThemedText style={styles.fieldValue}>
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </ThemedText>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="primary"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
    backgroundColor: tokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.outline,
    ...tokens.shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(95, 99, 104, 0.1)',
  },
  backIcon: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: tokens.colors.onSurface,
  },
  headerTitle: {
    fontWeight: '500' as const,
    color: tokens.colors.onSurface,
  },
  headerSpacer: {
    width: 40, // Same as back button to center the title
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center' as const,
    paddingVertical: tokens.spacing.xxxl,
    paddingHorizontal: tokens.spacing.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: 'white',
  },
  infoCard: {
    marginHorizontal: tokens.spacing.xl,
    marginBottom: tokens.spacing.xl,
    ...tokens.shadows.sm,
  },
  cardTitle: {
    fontWeight: '500' as const,
    marginBottom: tokens.spacing.lg,
    color: tokens.colors.onSurface,
  },
  infoField: {
    marginBottom: tokens.spacing.lg,
  },
  fieldLabel: {
    fontWeight: '500' as const,
    color: tokens.colors.onSurfaceVariant,
    marginBottom: tokens.spacing.xs,
    letterSpacing: 0.5,
  },
  fieldValue: {
    color: tokens.colors.onSurface,
  },
  passwordContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  passwordToggle: {
    padding: tokens.spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(95, 99, 104, 0.1)',
  },
  passwordToggleIcon: {
    fontSize: 16,
  },
  buttonSection: {
    paddingHorizontal: tokens.spacing.xl,
    marginBottom: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  actionButton: {
    // Button component styles will be applied
  },
};
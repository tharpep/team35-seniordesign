import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Typography, Card, Button } from '../components/ui';
import { commonStyles, tokens } from '../styles/theme';

export default function Profile() {
  const [showPassword, setShowPassword] = useState(false);
  
  // Fake user data
  const userData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@email.com",
    password: "password123"
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Typography variant="titleLarge" style={styles.headerTitle}>
          Profile
        </Typography>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userData.firstName.charAt(0)}{userData.lastName.charAt(0)}
            </Text>
          </View>
        </View>

        {/* Profile Information Card */}
        <Card style={styles.infoCard}>
          <Typography variant="titleMedium" style={styles.cardTitle}>
            Personal Information
          </Typography>
          
          <View style={styles.infoField}>
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              FIRST NAME
            </Typography>
            <Typography variant="bodyLarge" style={styles.fieldValue}>
              {userData.firstName}
            </Typography>
          </View>
          
          <View style={styles.infoField}>
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              LAST NAME
            </Typography>
            <Typography variant="bodyLarge" style={styles.fieldValue}>
              {userData.lastName}
            </Typography>
          </View>
          
          <View style={styles.infoField}>
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              EMAIL
            </Typography>
            <Typography variant="bodyLarge" style={styles.fieldValue}>
              {userData.email}
            </Typography>
          </View>
          
          <View style={styles.infoField}>
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              PASSWORD
            </Typography>
            <View style={styles.passwordContainer}>
              <Typography variant="bodyLarge" style={styles.fieldValue}>
                {showPassword ? userData.password : '••••••••'}
              </Typography>
              <TouchableOpacity 
                style={styles.passwordToggle}
                onPress={togglePasswordVisibility}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
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
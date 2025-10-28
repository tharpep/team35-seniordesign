import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Button, InputField, Typography, Card } from '../../components/ui';
import { commonStyles, tokens } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateAccount() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();

  const handleSubmit = async () => {
    // Basic validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    if (!agreeToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });

      if (result.success) {
        // Show success message and navigate to dashboard
        Alert.alert(
          'Success',
          'Your account has been created successfully!',
          [
            { 
              text: 'OK', 
              onPress: () => router.replace('./dashboard')
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Could not create account');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('./login');
  };

  const handleTermsPress = () => {
    Alert.alert('Terms of Service', 'Terms of Service would open here.');
  };

  const handlePrivacyPress = () => {
    Alert.alert('Privacy Policy', 'Privacy Policy would open here.');
  };

  return (
    <View style={commonStyles.authPage}>
      <ScrollView 
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: 'center',
          paddingVertical: tokens.spacing.xl 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Section */}
        <View style={commonStyles.brand}>
          <View style={commonStyles.brandLogo}>
            <View style={commonStyles.brandIcon}>
              <Text style={commonStyles.brandIconText}>🧠</Text>
            </View>
          </View>
          <Typography variant="displaySmall" style={commonStyles.brandTitle}>
            Study Coach
          </Typography>
          <Typography variant="bodyLarge" color="secondary" style={commonStyles.brandSubtitle}>
            Create your account
          </Typography>
        </View>

        {/* Create Account Form Card */}
        <Card variant="large" style={{ 
          marginHorizontal: tokens.spacing.xl,
          marginBottom: tokens.spacing.xl 
        }}>
          <View style={commonStyles.formSection}>
            {/* Name Fields */}
            <View style={{ 
              flexDirection: 'row', 
              gap: tokens.spacing.md,
              marginBottom: tokens.spacing.xl 
            }}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder=" "
                  autoComplete="given-name"
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder=" "
                  autoComplete="family-name"
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </View>

            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder=" "
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder=" "
              secureTextEntry
              autoComplete="new-password"
            />

            <InputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder=" "
              secureTextEntry
              autoComplete="new-password"
            />

            {/* Terms Agreement */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: tokens.spacing.xxl,
              gap: tokens.spacing.md,
            }}>
              <TouchableOpacity 
                style={{
                  width: 20,
                  height: 20,
                  borderWidth: 2,
                  borderColor: agreeToTerms ? tokens.colors.primary : tokens.colors.outlineVariant,
                  backgroundColor: agreeToTerms ? tokens.colors.primary : 'transparent',
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                }}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                {agreeToTerms && (
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                )}
              </TouchableOpacity>
              
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.bodySmall, { color: tokens.colors.onSurfaceVariant }]}>
                  I agree to the{' '}
                  <Text 
                    style={{ color: tokens.colors.primary, fontWeight: '500' }}
                    onPress={handleTermsPress}
                  >
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text 
                    style={{ color: tokens.colors.primary, fontWeight: '500' }}
                    onPress={handlePrivacyPress}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>

            {/* Create Account Button */}
            <Button
              title={isLoading ? "Creating Account..." : "Create Account"}
              onPress={handleSubmit}
              variant="primary"
              icon="👤"
              iconPosition="left"
              disabled={isLoading}
            />

            {isLoading && (
              <ActivityIndicator 
                size="small" 
                color={tokens.colors.primary} 
                style={{ marginTop: tokens.spacing.md }} 
              />
            )}
          </View>
        </Card>

        {/* Sign In Link */}
        <View style={{
          alignItems: 'center',
          paddingHorizontal: tokens.spacing.xl,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Typography variant="bodyMedium" color="secondary">
              Already have an account?{' '}
            </Typography>
            <TouchableOpacity onPress={handleSignIn}>
              <Typography variant="bodyMedium" color="link" style={{ fontWeight: '500' }}>
                Sign in
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


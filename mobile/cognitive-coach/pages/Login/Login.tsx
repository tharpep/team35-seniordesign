import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Button, InputField, Typography, Card } from '../../components/ui';
import { commonStyles, tokens } from '../../styles/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    // Mock login - navigate to dashboard
    console.log('Login attempt:', { email, password, rememberMe });
    router.push('./dashboard');
  };

  const handleSignUp = () => {
    router.push('./signup');
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset functionality would be implemented here.');
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
            Sign in to your account
          </Typography>
        </View>

        {/* Login Form Card */}
        <Card variant="large" style={{ 
          marginHorizontal: tokens.spacing.xl,
          marginBottom: tokens.spacing.xl 
        }}>
          <View style={commonStyles.formSection}>
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
              autoComplete="password"
            />

            {/* Login Options */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: tokens.spacing.xxl,
            }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderWidth: 2,
                  borderColor: rememberMe ? tokens.colors.primary : tokens.colors.outlineVariant,
                  backgroundColor: rememberMe ? tokens.colors.primary : 'transparent',
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {rememberMe && (
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                  )}
                </View>
                <Typography variant="bodySmall" color="secondary">
                  Stay signed in
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Typography variant="bodySmall" color="link">
                  Forgot password?
                </Typography>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <Button
              title="Continue"
              onPress={handleLogin}
              variant="primary"
              icon="→"
              iconPosition="left"
              style={{ marginBottom: tokens.spacing.xl }}
            />
          </View>
        </Card>

        {/* Signup Link */}
        <View style={{
          alignItems: 'center',
          paddingHorizontal: tokens.spacing.xl,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Typography variant="bodyMedium" color="secondary">
              New to Study Coach?{' '}
            </Typography>
            <TouchableOpacity onPress={handleSignUp}>
              <Typography variant="bodyMedium" color="link" style={{ fontWeight: '500' }}>
                Create account
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
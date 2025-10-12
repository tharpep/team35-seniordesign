import { StyleSheet } from 'react-native';

// Material 3 Design System - Design Tokens
export const tokens = {
  // Material 3 Colors
  colors: {
    primary: '#1a73e8',
    primaryHover: '#1557b0',
    primaryVariant: '#4285f4',
    surface: '#ffffff',
    background: '#fafbff',
    onSurface: '#202124',
    onSurfaceVariant: '#5f6368',
    outline: '#e8eaed',
    outlineVariant: '#dadce0',
    
    // Success/Warning/Error States
    success: '#34a853',
    successBg: '#e8f5e8',
    successBorder: '#c8e6c9',
    successText: '#2e7d32',
    warning: '#fbbc04',
    warningHover: '#e8900d',
    error: '#ea4335',
    errorBg: '#d93025',
    errorHover: '#b52d20',
  },
  
  // Spacing Scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  
  // Border Radius Scale
  radius: {
    xs: 6,
    sm: 8,
    md: 16,
    lg: 24,
    pill: 28,
  },
  
  // Typography
  typography: {
    fontPrimary: 'System', // React Native uses system fonts
    
    // Material 3 Typography Scale
    displayLarge: {
      fontSize: 57,
      fontWeight: '400' as const,
      lineHeight: 64,
      letterSpacing: -0.25,
    },
    displayMedium: {
      fontSize: 45,
      fontWeight: '400' as const,
      lineHeight: 52,
    },
    displaySmall: {
      fontSize: 36,
      fontWeight: '400' as const,
      lineHeight: 44,
    },
    headlineLarge: {
      fontSize: 32,
      fontWeight: '400' as const,
      lineHeight: 40,
      letterSpacing: -0.25,
    },
    headlineMedium: {
      fontSize: 28,
      fontWeight: '400' as const,
      lineHeight: 36,
    },
    headlineSmall: {
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 32,
    },
    titleLarge: {
      fontSize: 22,
      fontWeight: '400' as const,
      lineHeight: 28,
    },
    titleMedium: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    titleSmall: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: 0.25,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
  },
  
  // Shadows (React Native shadow properties)
  shadows: {
    sm: {
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 8,
    },
    primary: {
      shadowColor: '#1a73e8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    popup: {
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
  },
};

// Common Component Styles
export const commonStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  
  surface: {
    backgroundColor: tokens.colors.surface,
  },
  
  // Cards
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    ...tokens.shadows.md,
  },
  
  cardLarge: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xxl,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    ...tokens.shadows.md,
  },
  
  // Buttons
  primaryButton: {
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.xxxl,
    minWidth: 160,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    ...tokens.shadows.primary,
  },
  
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  
  secondaryButton: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.outlineVariant,
    borderRadius: 20,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  
  secondaryButtonText: {
    color: tokens.colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '500',
  },
  
  iconButtonCircular: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.outlineVariant,
    borderRadius: tokens.radius.pill,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Form Elements
  formField: {
    position: 'relative',
    marginBottom: tokens.spacing.xl,
  },
  
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.outlineVariant,
    borderRadius: tokens.radius.sm,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    fontSize: 16,
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.onSurface,
    minHeight: 56,
  },
  
  inputFocused: {
    borderColor: tokens.colors.primary,
    borderWidth: 2,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.onSurfaceVariant,
    marginBottom: tokens.spacing.sm,
  },
  
  // Typography Styles
  displayLarge: {
    ...tokens.typography.displayLarge,
    color: tokens.colors.onSurface,
  },
  
  displayMedium: {
    ...tokens.typography.displayMedium,
    color: tokens.colors.onSurface,
  },
  
  displaySmall: {
    ...tokens.typography.displaySmall,
    color: tokens.colors.onSurface,
  },
  
  headlineLarge: {
    ...tokens.typography.headlineLarge,
    color: tokens.colors.onSurface,
  },
  
  headlineMedium: {
    ...tokens.typography.headlineMedium,
    color: tokens.colors.onSurface,
  },
  
  headlineSmall: {
    ...tokens.typography.headlineSmall,
    color: tokens.colors.onSurface,
  },
  
  titleLarge: {
    ...tokens.typography.titleLarge,
    color: tokens.colors.onSurface,
  },
  
  titleMedium: {
    ...tokens.typography.titleMedium,
    color: tokens.colors.onSurface,
  },
  
  titleSmall: {
    ...tokens.typography.titleSmall,
    color: tokens.colors.onSurface,
  },
  
  bodyLarge: {
    ...tokens.typography.bodyLarge,
    color: tokens.colors.onSurface,
  },
  
  bodyMedium: {
    ...tokens.typography.bodyMedium,
    color: tokens.colors.onSurface,
  },
  
  bodySmall: {
    ...tokens.typography.bodySmall,
    color: tokens.colors.onSurface,
  },
  
  // Text Color Utilities
  textPrimary: {
    color: tokens.colors.onSurface,
  },
  
  textSecondary: {
    color: tokens.colors.onSurfaceVariant,
  },
  
  textLink: {
    color: tokens.colors.primary,
  },
  
  textSuccess: {
    color: tokens.colors.success,
  },
  
  textWarning: {
    color: tokens.colors.warning,
  },
  
  textError: {
    color: tokens.colors.error,
  },
  
  // Auth Page Styles
  authPage: {
    backgroundColor: tokens.colors.background,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  
  authContainer: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.outline,
    width: '100%',
    maxWidth: 400,
    ...tokens.shadows.md,
  },
  
  authForm: {
    padding: tokens.spacing.xxxl,
    paddingHorizontal: 40,
  },
  
  brand: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xxl,
  },
  
  brandLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  
  brandIcon: {
    width: 40,
    height: 40,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  brandIconText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  brandTitle: {
    color: tokens.colors.onSurface,
    fontSize: 28,
    fontWeight: '400',
    marginBottom: tokens.spacing.xs,
    textAlign: 'center',
  },
  
  brandSubtitle: {
    color: tokens.colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
  },
  
  formSection: {
    marginBottom: tokens.spacing.xxl,
  },
});

// Button Variants
export const buttonVariants = StyleSheet.create({
  error: {
    backgroundColor: tokens.colors.errorBg,
  },
  
  warning: {
    backgroundColor: tokens.colors.warning,
  },
});

// Utility functions for dynamic styling
export const createShadow = (elevation: 'sm' | 'md' | 'lg' | 'primary' | 'popup') => {
  return tokens.shadows[elevation];
};

export const createButtonStyle = (variant: 'primary' | 'secondary' | 'error' | 'warning' = 'primary') => {
  const baseStyle = variant === 'secondary' ? commonStyles.secondaryButton : commonStyles.primaryButton;
  
  if (variant === 'error') {
    return [baseStyle, buttonVariants.error];
  }
  
  if (variant === 'warning') {
    return [baseStyle, buttonVariants.warning];
  }
  
  return baseStyle;
};

export default { tokens, commonStyles, buttonVariants, createShadow, createButtonStyle };
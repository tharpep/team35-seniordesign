import React from 'react';
import { Text, TextStyle } from 'react-native';
import { commonStyles } from '../../styles/theme';

type TypographyVariant = 
  | 'displayLarge' | 'displayMedium' | 'displaySmall'
  | 'headlineLarge' | 'headlineMedium' | 'headlineSmall'
  | 'titleLarge' | 'titleMedium' | 'titleSmall'
  | 'bodyLarge' | 'bodyMedium' | 'bodySmall';

type TextColor = 'primary' | 'secondary' | 'link' | 'warning' | 'error';

interface TypographyProps {
  variant?: TypographyVariant;
  color?: TextColor;
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'bodyMedium',
  color = 'primary',
  children,
  style,
  numberOfLines,
}) => {
  const getColorStyle = () => {
    switch (color) {
      case 'secondary': return commonStyles.textSecondary;
      case 'link': return commonStyles.textLink;
      case 'warning': return commonStyles.textWarning;
      case 'error': return commonStyles.textError;
      default: return commonStyles.textPrimary;
    }
  };
  
  return (
    <Text
      style={[
        commonStyles[variant],
        getColorStyle(),
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};
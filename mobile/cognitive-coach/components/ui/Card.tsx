import React from 'react';
import { View, ViewStyle } from 'react-native';
import { commonStyles } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'large';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const cardStyle = variant === 'large' ? commonStyles.cardLarge : commonStyles.card;
  
  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
};
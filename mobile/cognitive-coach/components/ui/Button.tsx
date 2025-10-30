import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, View } from 'react-native';
import { commonStyles, createButtonStyle, tokens } from '../../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'error' | 'warning';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
}) => {
  const buttonStyle = createButtonStyle(variant);
  const isSecondary = variant === 'secondary';
  
  const renderContent = () => {
    if (!icon) {
      return (
        <Text
          style={[
            isSecondary ? commonStyles.secondaryButtonText : commonStyles.primaryButtonText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      );
    }

    const iconElement = (
      <Text
        style={[
          isSecondary ? commonStyles.secondaryButtonText : commonStyles.primaryButtonText,
          { fontSize: 18 },
          textStyle,
        ]}
      >
        {icon}
      </Text>
    );

    const textElement = (
      <Text
        style={[
          isSecondary ? commonStyles.secondaryButtonText : commonStyles.primaryButtonText,
          textStyle,
        ]}
      >
        {title}
      </Text>
    );

    return iconPosition === 'left' ? (
      <>
        {iconElement}
        {textElement}
      </>
    ) : (
      <>
        {textElement}
        {iconElement}
      </>
    );
  };
  
  return (
    <TouchableOpacity
      style={[
        buttonStyle,
        disabled && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};
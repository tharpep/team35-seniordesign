import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, ViewStyle, Animated } from 'react-native';
import { commonStyles, tokens } from '../../styles/theme';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  value,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [labelAnimation] = useState(new Animated.Value(value ? 1 : 0));
  
  const handleFocus = (e: any) => {
    setFocused(true);
    Animated.timing(labelAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };
  
  const handleBlur = (e: any) => {
    setFocused(false);
    if (!value) {
      Animated.timing(labelAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    onBlur?.(e);
  };

  const labelTop = labelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8],
  });

  const labelFontSize = labelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });
  
  return (
    <View style={[commonStyles.formField, containerStyle]}>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={[
            commonStyles.input,
            focused && commonStyles.inputFocused,
            error && { borderColor: tokens.colors.error },
            style,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          placeholderTextColor="transparent"
          {...props}
        />
        <Animated.Text
          style={[
            {
              position: 'absolute',
              left: tokens.spacing.lg,
              top: labelTop,
              fontSize: labelFontSize,
              color: focused 
                ? (error ? tokens.colors.error : tokens.colors.primary)
                : (error ? tokens.colors.error : tokens.colors.onSurfaceVariant),
              backgroundColor: tokens.colors.surface,
              paddingHorizontal: tokens.spacing.xs,
              fontWeight: '400',
            },
          ]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>
      </View>
      {error && (
        <Text style={[commonStyles.bodySmall, { color: tokens.colors.error, marginTop: tokens.spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
};
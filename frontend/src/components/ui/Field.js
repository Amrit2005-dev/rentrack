import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
export function FieldShell({ label, required, error, hint, children, style }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          gap: 6,
        },
        style,
      ]}
    >
      {label ? (
        <AppText variant="label" tone="body">
          {label}
          {required ? (
            <AppText variant="label" tone="danger">
              {' *'}
            </AppText>
          ) : null}
        </AppText>
      ) : null}
      {children}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="faint">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
export function TextField({
  label,
  required,
  error,
  hint,
  icon,
  suffix,
  containerStyle,
  multiline,
  onFocus,
  onBlur,
  ...input
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? t.status.dangerFg
    : focused
      ? t.accent.primary
      : t.color.line;
  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      style={containerStyle}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: t.spacing.sm,
          minHeight: multiline ? 96 : t.sizing.control,
          borderWidth: 1,
          borderColor,
          borderRadius: t.radius.md,
          backgroundColor: t.color.surface,
          paddingHorizontal: t.spacing.md,
          paddingVertical: multiline ? t.spacing.md : 0,
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? t.accent.primary : t.color.faint}
            style={{
              marginTop: multiline ? 2 : 0,
            }}
          />
        ) : null}
        <TextInput
          {...input}
          multiline={multiline}
          placeholderTextColor={t.color.faint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            t.type.body,
            {
              flex: 1,
              color: t.color.ink,
              paddingVertical: multiline ? 0 : 12,
              textAlignVertical: multiline ? 'top' : 'center',
              // RN Web draws a focus ring on top of our border.
              outlineStyle: 'none',
            },
          ]}
        />
        {suffix ? (
          <AppText variant="caption" tone="faint">
            {suffix}
          </AppText>
        ) : null}
      </View>
    </FieldShell>
  );
}

/** Mobile number with the fixed +91 country prefix the mockups show. */
export function PhoneField({
  label,
  required,
  error,
  hint,
  value,
  onChangeText,
  placeholder = 'Mobile Number',
  containerStyle,
  autoFocus,
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      style={containerStyle}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: t.spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            height: t.sizing.control,
            paddingHorizontal: t.spacing.md,
            borderWidth: 1,
            borderColor: t.color.line,
            borderRadius: t.radius.md,
            backgroundColor: t.color.canvas,
          }}
        >
          {/* Drawn, not an emoji: Windows Chrome renders 🇮🇳 as the letters "IN". */}
          <View
            style={{
              width: 18,
              height: 13,
              borderRadius: 2,
              overflow: 'hidden',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: t.color.line,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: '#FF9933',
              }}
            />
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
              }}
            />
            <View
              style={{
                flex: 1,
                backgroundColor: '#138808',
              }}
            />
          </View>
          <AppText variant="bodyStrong">+91</AppText>
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            height: t.sizing.control,
            paddingHorizontal: t.spacing.md,
            borderWidth: 1,
            borderColor: error
              ? t.status.dangerFg
              : focused
                ? t.accent.primary
                : t.color.line,
            borderRadius: t.radius.md,
            backgroundColor: t.color.surface,
          }}
        >
          <TextInput
            value={value}
            onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, 10))}
            placeholder={placeholder}
            placeholderTextColor={t.color.faint}
            keyboardType="number-pad"
            maxLength={10}
            autoFocus={autoFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
              t.type.body,
              {
                color: t.color.ink,
                outlineStyle: 'none',
              },
            ]}
          />
        </View>
      </View>
    </FieldShell>
  );
}

/** Read-only field that opens something (a picker, a calendar) when tapped. */
export function TapField({
  label,
  required,
  error,
  hint,
  value,
  placeholder,
  icon = 'chevron-down',
  leadingIcon,
  onPress,
  containerStyle,
}) {
  const t = useTheme();
  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      style={containerStyle}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}. ${value ?? placeholder}` : placeholder}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          height: t.sizing.control,
          borderWidth: 1,
          borderColor: error ? t.status.dangerFg : t.color.line,
          borderRadius: t.radius.md,
          backgroundColor: t.color.surface,
          paddingHorizontal: t.spacing.md,
        }}
      >
        {leadingIcon ? (
          <Ionicons name={leadingIcon} size={18} color={t.color.faint} />
        ) : null}
        <AppText
          variant="body"
          tone={value ? 'ink' : 'faint'}
          style={{
            flex: 1,
          }}
        >
          {value || placeholder}
        </AppText>
        <Ionicons name={icon} size={18} color={t.color.faint} />
      </Pressable>
    </FieldShell>
  );
}

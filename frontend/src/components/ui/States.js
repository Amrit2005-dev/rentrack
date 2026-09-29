import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { ApiError } from '@/api/client';
export function LoadingState({ label = 'Loading' }) {
  const t = useTheme();
  return (
    <View
      style={{
        paddingVertical: t.spacing.xxxl * 2,
        alignItems: 'center',
        gap: t.spacing.md,
      }}
    >
      <ActivityIndicator color={t.accent.primary} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}) {
  const t = useTheme();
  return (
    <View
      style={{
        paddingVertical: t.spacing.xxxl,
        alignItems: 'center',
        gap: t.spacing.md,
      }}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: t.accent.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={40} color={t.accent.primary} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText
          variant="body"
          tone="muted"
          align="center"
          style={{
            maxWidth: 300,
          }}
        >
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="outline"
          fullWidth={false}
          onPress={onAction}
          style={{
            marginTop: t.spacing.sm,
          }}
        />
      ) : null}
    </View>
  );
}
export function ErrorState({ error, onRetry }) {
  const t = useTheme();
  const apiError = error instanceof ApiError ? error : null;
  const isPermission = apiError?.isForbidden;
  return (
    <View
      style={{
        paddingVertical: t.spacing.xxxl,
        alignItems: 'center',
        gap: t.spacing.md,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: t.status.dangerBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={isPermission ? 'lock-closed-outline' : 'alert-circle-outline'}
          size={32}
          color={t.status.dangerFg}
        />
      </View>
      <AppText variant="heading" align="center">
        {isPermission ? 'Not available for your role' : 'Something went wrong'}
      </AppText>
      <AppText
        variant="body"
        tone="muted"
        align="center"
        style={{
          maxWidth: 320,
        }}
      >
        {apiError?.message ?? 'Please try again in a moment.'}
      </AppText>
      {onRetry && !isPermission ? (
        <Button label="Try again" variant="outline" fullWidth={false} onPress={onRetry} />
      ) : null}
    </View>
  );
}

/** Inline banner for form-level failures — never blocks the form itself. */
export function InlineError({ error }) {
  const t = useTheme();
  if (!error) return null;
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.spacing.sm,
        alignItems: 'flex-start',
        backgroundColor: t.status.dangerBg,
        borderRadius: t.radius.md,
        padding: t.spacing.md,
      }}
    >
      <Ionicons name="alert-circle" size={18} color={t.status.dangerFg} />
      <AppText
        variant="caption"
        tone="danger"
        style={{
          flex: 1,
        }}
      >
        {message}
      </AppText>
    </View>
  );
}

/** Neutral notice card — used for the "field not supported by the API" hints. */
export function Notice({
  icon = 'information-circle-outline',
  children,
  tone = 'accent',
}) {
  const t = useTheme();
  const palette =
    tone === 'warning'
      ? {
          bg: t.status.warningBg,
          fg: t.status.warningFg,
        }
      : tone === 'danger'
        ? {
            bg: t.status.dangerBg,
            fg: t.status.dangerFg,
          }
        : {
            bg: t.accent.primaryFaint,
            fg: t.accent.primaryDark,
          };
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.spacing.sm,
        alignItems: 'flex-start',
        backgroundColor: palette.bg,
        borderRadius: t.radius.md,
        padding: t.spacing.md,
      }}
    >
      <Ionicons name={icon} size={18} color={palette.fg} />
      <View
        style={{
          flex: 1,
        }}
      >
        {/*
          Interpolated copy arrives as an array of strings, not one string, and
          a bare text node inside a View is invalid in React Native. Wrap
          anything that is not already an element.
        */}
        {React.Children.toArray(children).every(
          (child) => typeof child === 'string' || typeof child === 'number',
        ) ? (
          <AppText
            variant="caption"
            style={{
              color: palette.fg,
            }}
          >
            {children}
          </AppText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

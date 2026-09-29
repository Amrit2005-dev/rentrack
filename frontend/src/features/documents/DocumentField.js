import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';

/** What a document scan is allowed to be. */
const ACCEPTED = ['image/*', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024;

const readableSize = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
};

/**
 * Attaches a scan (photo or PDF) of a document.
 *
 * `value` is the newly picked file, uploaded by the screen after it saves the
 * record; `existingUrl` is what the server already holds, offered as a link.
 */
export function DocumentField({ label, hint, value, onChange, existingUrl }) {
  const t = useTheme();
  const [error, setError] = useState(null);

  const pick = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      if (file.size && file.size > MAX_BYTES) {
        setError(`That file is ${readableSize(file.size)}. Keep it under 8 MB.`);
        return;
      }
      onChange(file);
    } catch {
      setError('Could not open the file picker on this device.');
    }
  };

  return (
    <View
      style={{
        gap: t.spacing.md,
      }}
    >
      {value ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.md,
            padding: t.spacing.md,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.color.line,
            backgroundColor: t.color.canvas,
          }}
        >
          <Ionicons
            name={
              value.mimeType === 'application/pdf'
                ? 'document-text-outline'
                : 'image-outline'
            }
            size={22}
            color={t.accent.primaryDark}
          />
          <View
            style={{
              flex: 1,
            }}
          >
            <AppText variant="body" numberOfLines={1}>
              {value.name}
            </AppText>
            <AppText variant="caption" tone="muted">
              {readableSize(value.size)}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove the attached document"
            hitSlop={10}
            onPress={() => onChange(null)}
          >
            <Ionicons name="close-circle" size={22} color={t.color.faint} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={pick}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.spacing.sm,
            minHeight: t.sizing.control,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: t.color.line,
            backgroundColor: pressed ? t.color.lineSoft : t.color.surface,
          })}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={t.accent.primaryDark} />
          <AppText
            variant="bodyStrong"
            style={{
              color: t.accent.primaryDark,
            }}
          >
            {existingUrl ? label.replace(/^Attach/, 'Replace') : label}
          </AppText>
        </Pressable>
      )}

      {existingUrl && !value ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(existingUrl)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.xs,
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color={t.status.successFg} />
          <AppText
            variant="caption"
            style={{
              color: t.accent.primaryDark,
              textDecorationLine: 'underline',
            }}
          >
            Uploaded, view current document
          </AppText>
        </Pressable>
      ) : null}

      <AppText variant="caption" tone="muted">
        {hint ?? 'A photo or PDF, up to 8 MB.'}
      </AppText>

      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

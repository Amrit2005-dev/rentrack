import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

/** Bottom sheet used by every picker in the app. */
export function Sheet({ visible, title, onClose, children }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(11,16,32,0.45)',
        }}
      />
      <View
        style={{
          backgroundColor: t.color.surface,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingBottom: insets.bottom + t.spacing.lg,
          maxHeight: '78%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: t.spacing.xl,
            paddingTop: t.spacing.xl,
            paddingBottom: t.spacing.md,
          }}
        >
          <AppText
            variant="heading"
            style={{
              flex: 1,
            }}
          >
            {title}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={t.color.muted} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

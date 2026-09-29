import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { TextField } from './Field';
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onFilterPress,
  filterActive,
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.spacing.sm,
        alignItems: 'flex-start',
      }}
    >
      <TextField
        containerStyle={{
          flex: 1,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        icon="search"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filters"
          onPress={onFilterPress}
          style={{
            width: t.sizing.control,
            height: t.sizing.control,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: filterActive ? t.accent.primary : t.color.line,
            backgroundColor: filterActive ? t.accent.primarySoft : t.color.surface,
          }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filterActive ? t.accent.primary : t.color.body}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

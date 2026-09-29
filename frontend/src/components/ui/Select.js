import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { TapField, TextField } from './Field';
import { Sheet } from './Sheet';
export function SelectField({
  label,
  required,
  error,
  hint,
  placeholder,
  options,
  value,
  onChange,
  searchable,
  allowClear,
  containerStyle,
  leadingIcon,
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value) ?? null;
  const visible = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.hint?.toLowerCase().includes(needle),
    );
  }, [options, query, searchable]);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  return (
    <>
      <TapField
        label={label}
        required={required}
        error={error}
        hint={hint}
        value={selected?.label}
        placeholder={placeholder}
        leadingIcon={leadingIcon}
        onPress={() => setOpen(true)}
        containerStyle={containerStyle}
      />

      <Sheet visible={open} title={label ?? placeholder} onClose={close}>
        {searchable ? (
          <View
            style={{
              paddingHorizontal: t.spacing.xl,
              paddingBottom: t.spacing.md,
            }}
          >
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              icon="search"
              autoCorrect={false}
            />
          </View>
        ) : null}

        <FlatList
          data={visible}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: t.spacing.xl,
          }}
          ListEmptyComponent={
            <AppText
              variant="body"
              tone="muted"
              align="center"
              style={{
                paddingVertical: t.spacing.xxl,
              }}
            >
              {query.trim() ? 'Nothing matches that search.' : 'Nothing to choose from yet.'}
            </AppText>
          }
          ListFooterComponent={
            allowClear && selected ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(null);
                  close();
                }}
                style={{
                  paddingVertical: t.spacing.lg,
                }}
              >
                <AppText variant="bodyStrong" tone="danger">
                  Clear selection
                </AppText>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            // A disabled option is listed with its hint as the reason it can't
            // be picked, rather than vanishing without explanation.
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: isSelected,
                  disabled: !!item.disabled,
                }}
                disabled={!!item.disabled}
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                style={{
                  opacity: item.disabled ? 0.5 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                  paddingVertical: t.spacing.lg,
                  borderBottomWidth: 1,
                  borderBottomColor: t.color.lineSoft,
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <AppText variant="bodyStrong">{item.label}</AppText>
                  {item.hint ? (
                    <AppText variant="caption" tone="muted">
                      {item.hint}
                    </AppText>
                  ) : null}
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={t.accent.primary} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </>
  );
}

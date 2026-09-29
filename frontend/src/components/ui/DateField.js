import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { TapField } from './Field';
import { Sheet } from './Sheet';
import { Button } from './Button';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * A self-contained month grid. Deliberately not a native picker: the app ships
 * to Android, iOS and web from one codebase, and the three native pickers look
 * and behave differently enough to break the mockups.
 */
export function Calendar({ value, onSelect, markedDates, minDate }) {
  const t = useTheme();
  const [cursor, setCursor] = useState(() => (value ?? dayjs()).startOf('month'));
  const cells = useMemo(() => {
    const start = cursor.startOf('month');
    const leading = start.day();
    const total = cursor.daysInMonth();
    const out = Array.from(
      {
        length: leading,
      },
      () => null,
    );
    for (let day = 1; day <= total; day += 1) out.push(start.date(day));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);
  const today = dayjs().startOf('day');
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.sm,
          marginBottom: t.spacing.md,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={12}
          onPress={() => setCursor(cursor.subtract(1, 'month'))}
        >
          <Ionicons name="chevron-back" size={20} color={t.color.body} />
        </Pressable>
        <AppText
          variant="subheading"
          align="center"
          style={{
            flex: 1,
          }}
        >
          {cursor.format('MMMM YYYY')}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={12}
          onPress={() => setCursor(cursor.add(1, 'month'))}
        >
          <Ionicons name="chevron-forward" size={20} color={t.color.body} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
        }}
      >
        {WEEKDAYS.map((day) => (
          <AppText
            key={day}
            variant="caption"
            tone="faint"
            align="center"
            style={{
              flex: 1,
            }}
          >
            {day}
          </AppText>
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: t.spacing.sm,
        }}
      >
        {cells.map((date, index) => {
          if (!date) {
            return (
              <View
                key={`pad-${index}`}
                style={{
                  width: `${100 / 7}%`,
                  height: 44,
                }}
              />
            );
          }
          const key = date.format('YYYY-MM-DD');
          const isSelected = !!value && date.isSame(value, 'day');
          const isToday = date.isSame(today, 'day');
          const disabled = !!minDate && date.isBefore(minDate, 'day');
          const mark = markedDates?.[key];
          const markColor =
            mark === 'success'
              ? t.status.successFg
              : mark === 'warning'
                ? t.status.warningFg
                : t.accent.primary;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={date.format('D MMMM YYYY')}
              accessibilityState={{
                selected: isSelected,
                disabled,
              }}
              disabled={disabled}
              onPress={() => onSelect(date)}
              style={{
                width: `${100 / 7}%`,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? t.accent.primary : 'transparent',
                  borderWidth: !isSelected && isToday ? 1 : 0,
                  borderColor: t.accent.primary,
                  opacity: disabled ? 0.3 : 1,
                }}
              >
                <AppText
                  variant="body"
                  style={{
                    color: isSelected ? t.accent.onPrimary : t.color.ink,
                  }}
                >
                  {date.date()}
                </AppText>
              </View>
              {mark && !isSelected ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: markColor,
                  }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function DateField({
  label,
  required,
  error,
  hint,
  value,
  onChange,
  placeholder = 'DD / MM / YYYY',
  minDate,
  containerStyle,
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const selected = value ? dayjs(value) : null;
  return (
    <>
      <TapField
        label={label}
        required={required}
        error={error}
        hint={hint}
        value={selected ? selected.format('DD / MM / YYYY') : undefined}
        placeholder={placeholder}
        icon="calendar-outline"
        onPress={() => setOpen(true)}
        containerStyle={containerStyle}
      />
      <Sheet visible={open} title={label ?? 'Select date'} onClose={() => setOpen(false)}>
        <View
          style={{
            paddingHorizontal: t.spacing.xl,
          }}
        >
          <Calendar
            value={selected}
            minDate={minDate}
            onSelect={(date) => {
              onChange(date.format('YYYY-MM-DD'));
              setOpen(false);
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

/** Hour/minute picker in 15-minute steps — enough for trip scheduling. */
export function TimeField({
  label,
  required,
  error,
  value,
  onChange,
  placeholder = 'Select time',
  containerStyle,
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const slots = useMemo(() => {
    const out = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 15, 30, 45]) {
        out.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      }
    }
    return out;
  }, []);
  const display = value ? dayjs(`2000-01-01T${value}`).format('hh:mm A') : undefined;
  return (
    <>
      <TapField
        label={label}
        required={required}
        error={error}
        value={display}
        placeholder={placeholder}
        icon="time-outline"
        onPress={() => setOpen(true)}
        containerStyle={containerStyle}
      />
      <Sheet visible={open} title={label ?? 'Select time'} onClose={() => setOpen(false)}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: t.spacing.sm,
            paddingHorizontal: t.spacing.xl,
          }}
        >
          {slots.map((slot) => {
            const isSelected = slot === value;
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityState={{
                  selected: isSelected,
                }}
                onPress={() => {
                  onChange(slot);
                  setOpen(false);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: t.radius.sm,
                  borderWidth: 1,
                  borderColor: isSelected ? t.accent.primary : t.color.line,
                  backgroundColor: isSelected ? t.accent.primarySoft : t.color.surface,
                }}
              >
                <AppText variant="caption" tone={isSelected ? 'accent' : 'body'}>
                  {dayjs(`2000-01-01T${slot}`).format('hh:mm A')}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View
          style={{
            padding: t.spacing.xl,
          }}
        >
          <Button label="Done" variant="outline" onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </>
  );
}

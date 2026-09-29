import React from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  InfoRow,
  Notice,
  Screen,
  ScreenHeader,
  SectionCard,
} from '@/components/ui';
import { useAuthStore, useCurrentUser } from '@/store/auth';
import { displayName, roleLabel } from '@/utils/permissions';
import { formatDate, humanise } from '@/utils/format';
import { useTheme } from '@/theme';
import { MenuButton } from '@/features/shell/MenuButton';
/**
 * Who you are signed in as — and nothing else.
 *
 * This screen used to carry the eight sections that had no bottom tab
 * (Challans, Quotations, Invoices, Ledger, TDS, Reports, Users,
 * Notifications), because there was nowhere else to put them. They live in the
 * navigation drawer now (features/shell/AppDrawer.js), reachable from the
 * header of every tab.
 */
export default function AdminAccountScreen() {
  const t = useTheme();
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Log out of MoveXpress?')) void signOut();
      return;
    }
    Alert.alert('Log out', 'You will be logged out from the app.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => void signOut(),
      },
    ]);
  };
  return (
    <Screen>
      <ScreenHeader title="Profile" large left={<MenuButton />} />

      <Card
        padded={false}
        style={{
          overflow: 'hidden',
          borderWidth: 0,
        }}
      >
        <LinearGradient
          colors={[t.accent.primary, t.accent.primaryPressed]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={{
            padding: t.spacing.xl,
            gap: t.spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.md,
            }}
          >
            <Avatar name={displayName(user)} size={58} tone="neutral" />
            <View
              style={{
                flex: 1,
                gap: 4,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.sm,
                }}
              >
                <AppText
                  variant="heading"
                  tone="inverse"
                  numberOfLines={1}
                  style={{
                    flexShrink: 1,
                  }}
                >
                  {displayName(user)}
                </AppText>
                <Badge label={roleLabel(user?.role)} tone="neutral" />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="call-outline" size={14} color="#FFFFFF" />
                <AppText variant="caption" tone="inverse">
                  {user?.mobile_number ?? '—'}
                </AppText>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Card>

      <SectionCard title="Account Information" icon="person-circle-outline">
        <InfoRow
          label="First Name"
          value={user?.first_name ?? '—'}
          icon="id-card-outline"
        />
        <InfoRow
          label="Last Name"
          value={user?.last_name ?? '—'}
          icon="id-card-outline"
        />
        <InfoRow
          label="Mobile Number"
          value={user?.mobile_number ?? '—'}
          icon="call-outline"
        />
        <InfoRow label="Role" value={roleLabel(user?.role)} icon="ribbon-outline" />
        <InfoRow
          label="Status"
          value={humanise(user?.status)}
          icon="checkmark-circle-outline"
        />
        <InfoRow
          label="Member Since"
          value={formatDate(user?.created_at)}
          icon="calendar-outline"
          last
        />
      </SectionCard>

      {/* Sign-in is email + password (POST /auth/login). */}
      <Notice icon="shield-checkmark-outline">
        You sign in with your email address and password. Contact your administrator if
        you need it reset.
      </Notice>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={confirmSignOut}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
          padding: t.spacing.lg,
          borderRadius: t.radius.lg,
          backgroundColor: t.status.dangerBg,
        }}
      >
        <Ionicons name="log-out-outline" size={22} color={t.status.dangerFg} />
        <View
          style={{
            flex: 1,
          }}
        >
          <AppText variant="bodyStrong" tone="danger">
            Logout
          </AppText>
          <AppText
            variant="caption"
            style={{
              color: t.status.dangerFg,
              opacity: 0.8,
            }}
          >
            You will be logged out from the app
          </AppText>
        </View>
      </Pressable>
    </Screen>
  );
}

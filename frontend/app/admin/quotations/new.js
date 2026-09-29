import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  DateField,
  InlineError,
  Notice,
  Screen,
  ScreenHeader,
  SectionCard,
  SelectField,
  TextField,
} from '@/components/ui';
import { ClientField } from '@/features/billing/ClientField';
import { useCreateQuotation } from '@/hooks/billing';
import { currency } from '@/utils/format';
import { useTheme } from '@/theme';
import { SuperAdminWriteNotice } from '@/features/accounts/SuperAdminWriteNotice';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
const MACHINE_TYPES = ['JCB', 'CRANE', 'TIPPER', 'TRAILER', 'EXCAVATOR', 'TRUCK'];
const toNumber = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * SRS Module 5 — quotation entry. Everything here is in the documented
 * QuotationCreate contract, but note the warning shown on screen: the server's
 * create_quotation is still a skeleton that stores only the client and status,
 * so the rates below will not come back on the saved record yet.
 */
export default function NewQuotationScreen() {
  const { canManageOrganizations: isPlatformAdmin } = usePermissions();
  // Managing a company supplies the org_id the create route needs.
  const scopedCompanyId = useScopedCompanyId();
  if (isPlatformAdmin && !scopedCompanyId) {
    return <SuperAdminWriteNotice title="New Quotation" resource="Quotations" />;
  }

  const t = useTheme();
  const create = useCreateQuotation();
  const [clientId, setClientId] = useState(null);
  const [machineType, setMachineType] = useState(null);
  const [packageDetails, setPackageDetails] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [perKmRate, setPerKmRate] = useState('');
  const [perTonRate, setPerTonRate] = useState('');
  const [totalRate, setTotalRate] = useState('');
  const [validityDate, setValidityDate] = useState(null);
  const [terms, setTerms] = useState('');
  const [errors, setErrors] = useState({});

  /** Until the operator overrides it, the total is the base rate. */
  const suggestedTotal = useMemo(() => toNumber(baseRate) ?? 0, [baseRate]);
  const effectiveTotal = toNumber(totalRate) ?? suggestedTotal;
  const submit = () => {
    const next = {};
    for (const [key, value] of Object.entries({
      base_rate: baseRate,
      per_km_rate: perKmRate,
      per_ton_rate: perTonRate,
      total_rate: totalRate,
    })) {
      if (value.trim() && toNumber(value) === null) next[key] = 'Enter a valid amount';
      if (toNumber(value) !== null && toNumber(value) < 0) {
        next[key] = 'Amount cannot be negative';
      }
    }
    if (!machineType) next.machine_type = 'Pick the machine this rate covers';
    setErrors(next);
    if (Object.keys(next).length) return;
    create.mutate(
      {
        client_id: clientId,
        machine_type: machineType,
        package_details: packageDetails.trim() || null,
        base_rate: toNumber(baseRate),
        per_km_rate: toNumber(perKmRate),
        per_ton_rate: toNumber(perTonRate),
        total_rate: toNumber(totalRate) ?? toNumber(baseRate),
        validity_date: validityDate,
        custom_terms: terms.trim() || null,
      },
      {
        onSuccess: (quotation) => router.replace(`/admin/quotations/${quotation.id}`),
      },
    );
  };
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <ScreenHeader
          title="New Quotation"
          subtitle="Offer a machine rate to a client"
          back
        />

        <SectionCard title="Quotation Details" icon="document-text-outline">
          <ClientField value={clientId} onChange={setClientId} />
          <SelectField
            label="Machine Type"
            required
            placeholder="Select machine"
            leadingIcon="construct-outline"
            value={machineType}
            onChange={setMachineType}
            error={errors.machine_type}
            options={MACHINE_TYPES.map((type) => ({
              value: type,
              label: type,
            }))}
          />
          <TextField
            label="Package Details"
            value={packageDetails}
            onChangeText={setPackageDetails}
            placeholder="8 hours per day, diesel included"
            multiline
          />
          <DateField
            label="Valid Until"
            value={validityDate}
            onChange={setValidityDate}
            hint="Leave blank for an open-ended offer."
          />
        </SectionCard>

        <SectionCard title="Rates" icon="pricetag-outline">
          <TextField
            label="Base Rate"
            value={baseRate}
            onChangeText={setBaseRate}
            placeholder="0"
            keyboardType="decimal-pad"
            icon="cash-outline"
            error={errors.base_rate}
            hint="Fixed charge for the package."
          />
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <TextField
              label="Per KM"
              containerStyle={{
                flex: 1,
              }}
              value={perKmRate}
              onChangeText={setPerKmRate}
              placeholder="0"
              keyboardType="decimal-pad"
              error={errors.per_km_rate}
            />
            <TextField
              label="Per Ton"
              containerStyle={{
                flex: 1,
              }}
              value={perTonRate}
              onChangeText={setPerTonRate}
              placeholder="0"
              keyboardType="decimal-pad"
              error={errors.per_ton_rate}
            />
          </View>
          <TextField
            label="Total Rate"
            value={totalRate}
            onChangeText={setTotalRate}
            placeholder={String(suggestedTotal || 0)}
            keyboardType="decimal-pad"
            icon="calculator-outline"
            error={errors.total_rate}
            hint="Leave blank to quote the base rate as the total."
          />

          <View
            style={{
              backgroundColor: t.accent.primaryFaint,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              <AppText
                variant="bodyStrong"
                style={{
                  flex: 1,
                }}
              >
                Quoted total
              </AppText>
              <AppText variant="bodyStrong" tone="accent">
                {currency(effectiveTotal)}
              </AppText>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Terms" icon="reader-outline">
          <TextField
            label="Custom Terms"
            value={terms}
            onChangeText={setTerms}
            placeholder="Payment within 15 days of invoice. Overtime billed hourly."
            multiline
          />
        </SectionCard>

        <Notice icon="warning-outline">
          Heads up: the API&apos;s quotation service is still a skeleton — it saves the
          client and a draft status and drops the rates. Everything on this form matches
          the published contract and will persist as soon as that service is completed.
        </Notice>

        {create.error ? <InlineError error={create.error} /> : null}

        <Button
          label="Create Quotation"
          icon="add-circle-outline"
          loading={create.isPending}
          onPress={submit}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

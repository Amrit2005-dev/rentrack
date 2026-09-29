import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { findRateCard, rateCardsApi, ratesOf } from '@/api/rateCards';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
import { qk } from './keys';

/**
 * The company's rate cards.
 *
 * One list serves every screen that prices something — challans, trips,
 * quotations — because a company has a handful of cards, not thousands, and
 * re-fetching per machine type would make the amount flicker as the operator
 * changes the selection.
 */
export function useRateCards(params = {}) {
  const scopedCompanyId = useScopedCompanyId();
  const { canManageBilling } = usePermissions();
  const query = { ...params, ...(scopedCompanyId ? { org_id: scopedCompanyId } : {}) };
  return useQuery({
    queryKey: qk.rateCards.list(query),
    queryFn: () => rateCardsApi.list(query),
    enabled: canManageBilling,
    // Rates change when someone edits the charge sheet, not minute to minute.
    staleTime: 5 * 60_000,
  });
}

/**
 * A lookup that answers "what does this machine cost?" — the shape the forms
 * want, since they hold a vehicle id and need rates without knowing that a
 * card is keyed on the machine's *type*.
 */
export function useRateLookup(clientId) {
  const { data, isLoading, error } = useRateCards();
  const cards = useMemo(() => data?.items ?? [], [data]);

  /** The card for a vehicle, or null when the charge sheet has no entry. */
  const cardFor = useCallback(
    (vehicle) => findRateCard(cards, vehicle?.type, clientId),
    [cards, clientId],
  );

  /** Rates for a vehicle, zeroed when no card matches so maths still runs. */
  const ratesFor = useCallback((vehicle) => ratesOf(cardFor(vehicle)), [cardFor]);

  return {
    cards,
    cardFor,
    ratesFor,
    isLoading,
    error,
    /** False when nothing is configured yet — screens say so rather than quietly charging zero. */
    hasRateCards: cards.length > 0,
  };
}

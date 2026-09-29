import React from 'react';
import { CollectionsView } from '@/features/money/CollectionsView';

/**
 * SRS B7 — Driver Daily Collection, office side.
 *
 * The same view the driver sees, but console staff can read the crew list, so
 * here it can actually record a collection against a named driver.
 */
export default function AdminCollectionsScreen() {
  return <CollectionsView shell="admin" />;
}

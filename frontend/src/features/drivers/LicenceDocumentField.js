import React from 'react';
import { DocumentField } from '@/features/documents/DocumentField';

/** Attaches a scan of the driving licence. */
export function LicenceDocumentField({ value, onChange, existingUrl }) {
  return (
    <DocumentField
      label="Attach Licence Document"
      hint="A photo or PDF of the licence, up to 8 MB."
      value={value}
      onChange={onChange}
      existingUrl={existingUrl}
    />
  );
}

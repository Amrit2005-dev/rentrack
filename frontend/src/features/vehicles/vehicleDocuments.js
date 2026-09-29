import { vehiclesApi } from '@/api/vehicles';

/**
 * The compliance documents a vehicle can carry a scan of. `kind` is the
 * /vehicles/{id}/documents/{kind} segment, `urlKey` the field that holds the
 * stored file.
 */
export const VEHICLE_DOCUMENTS = [
  { kind: 'rc', label: 'RC', urlKey: 'rc_document_url' },
  { kind: 'insurance', label: 'Insurance', urlKey: 'insurance_document_url' },
  { kind: 'fitness', label: 'Fitness Certificate', urlKey: 'fitness_document_url' },
  { kind: 'puc', label: 'PUC Certificate', urlKey: 'puc_document_url' },
];

/**
 * Uploads each picked file ({ [kind]: file }) once the vehicle exists.
 *
 * The vehicle is saved either way, so a file that cannot be stored is reported
 * back by name rather than undoing the save. Returns the labels that failed.
 */
export async function uploadVehicleDocuments(vehicleId, documents = {}) {
  const failed = [];
  for (const { kind, label } of VEHICLE_DOCUMENTS) {
    const file = documents[kind];
    if (!file) continue;
    try {
      await vehiclesApi.uploadDocument(vehicleId, kind, file);
    } catch (error) {
      failed.push(`${label} (${error?.message ?? 'upload failed'})`);
    }
  }
  return failed;
}

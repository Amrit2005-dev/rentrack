import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';
import { usePermissions } from '@/store/auth';
import { qk } from './keys';

export function useClients(params = { page_size: 200 }) {
  const { canViewResources } = usePermissions();
  return useQuery({
    queryKey: qk.clients.list(params),
    queryFn: () => clientsApi.list(params),
    enabled: canViewResources,
    // Names change rarely and every billing screen wants them.
    staleTime: 5 * 60 * 1000,
  });
}

export const useClient = (id) =>
  useQuery({
    queryKey: qk.clients.detail(id),
    queryFn: () => clientsApi.get(id),
    enabled: !!id,
  });

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, params }) => clientsApi.create(body, params),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.clients.all }),
  });
}

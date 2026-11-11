import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';

/**
 * Estado de servidor (TanStack Query).
 *
 * La base de datos es la fuente de verdad. La última copia de las consultas se
 * guarda en IndexedDB solo como CACHÉ, para que la app abra sin conexión
 * mostrando los últimos datos conocidos. Se borra al cerrar sesión.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 días (necesario para persistir)
      retry: (count, error) => {
        const status = (error as { status?: number } | null)?.status;
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: true,
    },
    mutations: {
      networkMode: 'online',
    },
  },
});

const CACHE_KEY = 'fp-query-cache';

export const queryPersister = createAsyncStoragePersister({
  key: CACHE_KEY,
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value: string) => set(key, value),
    removeItem: (key) => del(key),
  },
  throttleTime: 1000,
});

/** Versión del formato de caché: cambiarla invalida cachés viejas tras un cambio de esquema. */
export const CACHE_BUSTER = 'v2';

/** Borra la caché en memoria y la persistida (al cerrar sesión). */
export async function clearQueryCache() {
  queryClient.clear();
  try {
    await del(CACHE_KEY);
  } catch {
    // IndexedDB puede no estar disponible (modo privado): no es crítico.
  }
}

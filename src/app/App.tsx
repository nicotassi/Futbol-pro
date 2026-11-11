import { RouterProvider } from 'react-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthProvider';
import { SetupRequiredPage } from '@/features/auth/SetupRequiredPage';
import { isSupabaseConfigured } from '@/services/supabase';
import { CACHE_BUSTER, queryClient, queryPersister } from '@/services/queryClient';
import { router } from './router';

export function App() {
  if (!isSupabaseConfigured) return <SetupRequiredPage />;
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: 1000 * 60 * 60 * 24 * 7,
          buster: CACHE_BUSTER,
        }}
      >
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

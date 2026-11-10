import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/feedback/LoadingState';
import DashboardPage from '@/pages/Dashboard/DashboardPage';

// Pantallas secundarias en chunks separados: el inicio carga más rápido en el celular.
const TrainingPage = lazy(() => import('@/pages/Training/TrainingPage'));
const TrainingModePage = lazy(() => import('@/pages/Training/TrainingModePage'));
const ExercisesPage = lazy(() => import('@/pages/Exercises/ExercisesPage'));
const GoalsPage = lazy(() => import('@/pages/Goals/GoalsPage'));
const EvolutionPage = lazy(() => import('@/pages/Evolution/EvolutionPage'));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'));
const MatchesPage = lazy(() => import('@/pages/Matches/MatchesPage'));
const RecoveryPage = lazy(() => import('@/pages/Recovery/RecoveryPage'));
const CalendarPage = lazy(() => import('@/pages/Calendar/CalendarPage'));
const WatchUploadPage = lazy(() => import('@/pages/WatchUpload/WatchUploadPage'));
const AdministrationPage = lazy(() => import('@/pages/Administration/AdministrationPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFound/NotFoundPage'));
// Catálogo de componentes: solo existe en desarrollo (se elimina del build de producción).
const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/DesignSystem/DesignSystemPage'))
  : null;

const page = (node: ReactNode) => (
  <Suspense
    fallback={
      <div className="pt-8">
        <LoadingState rows={3} />
      </div>
    }
  >
    {node}
  </Suspense>
);

export const routes = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'entrenar', element: page(<TrainingPage />) },
      { path: 'entrenar/ejercicios', element: page(<ExercisesPage />) },
      { path: 'objetivos', element: page(<GoalsPage />) },
      { path: 'evolucion', element: page(<EvolutionPage />) },
      { path: 'perfil', element: page(<ProfilePage />) },
      { path: 'partidos', element: page(<MatchesPage />) },
      { path: 'recuperacion', element: page(<RecoveryPage />) },
      { path: 'calendario', element: page(<CalendarPage />) },
      { path: 'reloj', element: page(<WatchUploadPage />) },
      { path: 'admin', element: page(<AdministrationPage />) },
      ...(DesignSystemPage ? [{ path: '_design', element: page(<DesignSystemPage />) }] : []),
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
  // Modo entrenamiento: pantalla completa, sin navegación.
  { path: 'entrenar/sesion/:sessionId', element: page(<TrainingModePage />) },
];

export const router = createBrowserRouter(routes);

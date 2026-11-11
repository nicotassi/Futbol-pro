import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/feedback/LoadingState';
import { RouteError } from '@/components/feedback/RouteError';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequireAdmin } from '@/features/auth/RequireAdmin';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const SignupPage = lazy(() => import('@/features/auth/SignupPage'));

// Pantallas secundarias en chunks separados: el inicio carga más rápido en el celular.
const TrainingPage = lazy(() => import('@/pages/Training/TrainingPage'));
const TrainingModePage = lazy(() => import('@/pages/Training/TrainingModePage'));
const ExercisesPage = lazy(() => import('@/pages/Exercises/ExercisesPage'));
const ExerciseDetailPage = lazy(() => import('@/pages/Exercises/ExerciseDetailPage'));
const ExerciseFormPage = lazy(() => import('@/pages/Exercises/ExerciseFormPage'));
const WorkoutBuilderPage = lazy(() => import('@/pages/Training/WorkoutBuilderPage'));
const SessionHistoryPage = lazy(() => import('@/pages/Training/SessionHistoryPage'));
const GoalsPage = lazy(() => import('@/pages/Goals/GoalsPage'));
const EvolutionPage = lazy(() => import('@/pages/Evolution/EvolutionPage'));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'));
const MatchesPage = lazy(() => import('@/pages/Matches/MatchesPage'));
const RecoveryPage = lazy(() => import('@/pages/Recovery/RecoveryPage'));
const CalendarPage = lazy(() => import('@/pages/Calendar/CalendarPage'));
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
  { path: 'ingresar', element: page(<LoginPage />) },
  { path: 'crear-cuenta', element: page(<SignupPage />) },
  { path: 'configuracion', element: <Navigate to="/crear-cuenta" replace /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'entrenar', element: page(<TrainingPage />) },
      { path: 'entrenar/ejercicios', element: page(<ExercisesPage />) },
      { path: 'entrenar/ejercicios/:id', element: page(<ExerciseDetailPage />) },
      {
        path: 'entrenar/ejercicios/nuevo',
        element: page(
          <RequireAdmin title="Nuevo ejercicio">
            <ExerciseFormPage />
          </RequireAdmin>,
        ),
      },
      {
        path: 'entrenar/ejercicios/:id/editar',
        element: page(
          <RequireAdmin title="Editar ejercicio">
            <ExerciseFormPage />
          </RequireAdmin>,
        ),
      },
      {
        path: 'entrenar/nuevo',
        element: page(
          <RequireAdmin title="Nuevo entrenamiento">
            <WorkoutBuilderPage />
          </RequireAdmin>,
        ),
      },
      {
        path: 'entrenar/:id/editar',
        element: page(
          <RequireAdmin title="Editar entrenamiento">
            <WorkoutBuilderPage />
          </RequireAdmin>,
        ),
      },
      { path: 'entrenar/historial', element: page(<SessionHistoryPage />) },
      { path: 'objetivos', element: page(<GoalsPage />) },
      { path: 'evolucion', element: page(<EvolutionPage />) },
      { path: 'perfil', element: page(<ProfilePage />) },
      { path: 'partidos', element: page(<MatchesPage />) },
      { path: 'recuperacion', element: page(<RecoveryPage />) },
      { path: 'calendario', element: page(<CalendarPage />) },
      {
        path: 'admin',
        element: page(
          <RequireAdmin title="Administración">
            <AdministrationPage />
          </RequireAdmin>,
        ),
      },
      ...(DesignSystemPage ? [{ path: '_design', element: page(<DesignSystemPage />) }] : []),
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
  // Modo entrenamiento: pantalla completa, sin navegación.
  {
    path: 'entrenar/sesion/:sessionId',
    element: <RequireAuth>{page(<TrainingModePage />)}</RequireAuth>,
    errorElement: <RouteError />,
  },
];

// BASE_URL = '/' en desarrollo y '/Futbol-pro/' en GitHub Pages.
export const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
});

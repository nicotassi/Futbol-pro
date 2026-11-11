import { expect, test } from '@playwright/test';
import { loginAs, mockSupabase, PLAYER_ID } from './support/mockSupabase';

const ymd = (d: Date) => d.toLocaleDateString('en-CA');
const ts = () => new Date().toISOString();

function seed(mock: Awaited<ReturnType<typeof mockSupabase>>) {
  const today = new Date();
  mock.tables.workout_sessions!.push({
    id: crypto.randomUUID(),
    player_id: PLAYER_ID,
    template_id: null,
    title: 'Plaza',
    started_at: today.toISOString(),
    ended_at: today.toISOString(),
    status: 'completed',
    actual_minutes: 45,
    rpe: 6,
    notes: null,
    post_state: 4,
    client_id: crypto.randomUUID(),
    created_by: null,
    created_at: ts(),
    updated_at: ts(),
  });
  mock.tables.matches!.push({
    id: crypto.randomUUID(),
    player_id: PLAYER_ID,
    played_on: ymd(today),
    opponent: 'Club Sur',
    competition: null,
    goals_for: 2,
    goals_against: 0,
    position: null,
    minutes: 40,
    starter: true,
    notes: null,
    client_id: crypto.randomUUID(),
    removed: false,
    created_by: null,
    created_at: ts(),
    updated_at: ts(),
  });
  mock.tables.assessments!.push(
    ...['speed', 'control', 'passing'].map((dimension, i) => ({
      id: crypto.randomUUID(),
      player_id: PLAYER_ID,
      assessed_on: ymd(today),
      dimension,
      test_name: `Prueba ${i}`,
      value: null,
      unit: null,
      score: 6 + i,
      notes: null,
      removed: false,
      created_at: ts(),
    })),
  );
}

test('Evolución: sin datos no inventa nada; con datos muestra gráficos reales', async ({
  page,
}) => {
  const mock = await mockSupabase(page);
  await loginAs(page, 'player');
  await page.goto('/evolucion');
  await expect(page.getByText('Sin entrenamientos registrados')).toBeVisible();
  await page.getByRole('tab', { name: 'Comparar' }).click();
  await expect(page.getByText('Nada para comparar todavía')).toBeVisible();

  seed(mock);
  await page.reload();
  await expect(page.getByRole('img', { name: 'Minutos entrenados por semana' })).toBeVisible();
  await page.getByRole('tab', { name: 'Capacidades' }).click();
  await expect(page.getByRole('img', { name: /Velocidad: 6 de 10/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Partidos' }).click();
  await expect(page.getByText('Falta al menos otro partido')).toBeVisible();
});

test('Logros y nivel salen de los registros reales', async ({ page }) => {
  const mock = await mockSupabase(page);
  seed(mock);
  await loginAs(page, 'player');
  await page.goto('/objetivos');
  // 1 día de entrenamiento (10) + 1 de partido (15) + 1 de evaluación (5) = 30 puntos
  await expect(page.getByText(/30 puntos/)).toBeVisible();
  await page.getByRole('tab', { name: 'Logros' }).click();
  await expect(page.getByText('Primer entrenamiento').locator('..').locator('..')).toContainText(
    'Conseguido',
  );
  await expect(page.getByText('Semana completa').locator('..').locator('..')).toContainText(
    'Por conseguir',
  );
});

test('Calendario: papá crea y cancela un evento; el partido y el entrenamiento aparecen', async ({
  page,
}) => {
  const mock = await mockSupabase(page);
  seed(mock);
  await loginAs(page, 'admin');
  await page.goto('/calendario');
  await page.getByRole('tab', { name: 'Día', exact: true }).click();
  await expect(page.getByText('Partido vs Club Sur')).toBeVisible();
  await expect(page.getByText('Plaza', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Evento', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Nuevo evento' });
  await sheet.getByRole('button', { name: 'Guardar evento' }).click();
  await expect(sheet.getByText('Poné un título (mínimo 2 letras).')).toBeVisible();
  await sheet.getByLabel('Título').fill('Práctica con el equipo');
  await sheet.getByRole('button', { name: 'Guardar evento' }).click();
  await expect(page.getByText('Práctica con el equipo')).toBeVisible();
  expect(mock.tables.calendar_events).toHaveLength(1);

  await page.getByRole('button', { name: 'Cancelar Práctica con el equipo' }).click();
  await expect(page.getByText('Práctica con el equipo')).toHaveCount(0);
  expect(mock.tables.calendar_events![0]).toMatchObject({ status: 'cancelled' });
});

test('Calendario: el jugador no ve el botón para crear eventos', async ({ page }) => {
  await mockSupabase(page);
  await loginAs(page, 'player');
  await page.goto('/calendario');
  await expect(page.getByRole('heading', { name: 'Calendario' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Evento', exact: true })).toHaveCount(0);
});

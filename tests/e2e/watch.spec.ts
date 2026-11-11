import { expect, test } from '@playwright/test';
import { loginAs, mockSupabase, PLAYER_ID } from './support/mockSupabase';

const SESSION_ID = '20000000-0000-4000-8000-000000000001';

function seed(mock: Awaited<ReturnType<typeof mockSupabase>>) {
  const ts = new Date().toISOString();
  mock.tables.workout_sessions!.push({
    id: SESSION_ID,
    player_id: PLAYER_ID,
    template_id: null,
    title: 'Partido en la plaza',
    started_at: ts,
    ended_at: ts,
    status: 'completed',
    actual_minutes: 40,
    rpe: 6,
    notes: null,
    post_state: 4,
    client_id: crypto.randomUUID(),
    created_by: null,
    created_at: ts,
    updated_at: ts,
  });
  const metric = (type: string, value: string, unit: string, confidence: number) => ({
    id: crypto.randomUUID(),
    upload_id: crypto.randomUUID(),
    player_id: PLAYER_ID,
    workout_session_id: SESSION_ID,
    metric_type: type,
    metric_value: value,
    metric_unit: unit,
    source: 'resumen',
    confidence,
    validation_status: 'pending',
    confirmed_value: null,
    created_at: ts,
  });
  mock.tables.watch_metrics!.push(
    metric('heart_rate_avg', '142', 'lpm', 0.9),
    metric('calories', '31O', 'kcal', 0.3),
  );
}

test('papá revisa los datos del reloj: confirma, corrige, descarta y carga uno a mano', async ({
  page,
}) => {
  const mock = await mockSupabase(page);
  seed(mock);
  await loginAs(page, 'admin');
  await page.goto('/reloj');

  await expect(page.getByText('Requiere revisión manual')).toBeVisible();
  await expect(page.getByText('Todavía no hay datos confirmados.')).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar FC promedio' }).click();
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible();
  expect(mock.tables.watch_metrics![0]).toMatchObject({
    validation_status: 'confirmed',
    confirmed_value: '142',
  });

  await page.getByRole('button', { name: 'Corregir' }).click();
  await page.getByLabel('Valor correcto').fill('310');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Corregido', { exact: true })).toBeVisible();
  expect(mock.tables.watch_metrics![1]).toMatchObject({
    validation_status: 'corrected',
    confirmed_value: '310',
    metric_value: '31O',
  });

  await page.getByLabel('Valor', { exact: true }).fill('150');
  await page.getByRole('button', { name: 'Guardar dato' }).click();
  await expect(page.getByText('Manual', { exact: true })).toBeVisible();
  // El dato manual reemplaza al oficial anterior de la misma métrica (no se duplica)
  const official = mock.tables.watch_metrics!.filter(
    (m) =>
      m.metric_type === 'heart_rate_avg' &&
      ['confirmed', 'corrected'].includes(m.validation_status as string),
  );
  expect(official).toHaveLength(1);
  expect(official[0]).toMatchObject({ confirmed_value: '150' });
});

test('papá descarta un dato dudoso y no entra a las estadísticas', async ({ page }) => {
  const mock = await mockSupabase(page);
  seed(mock);
  await loginAs(page, 'admin');
  await page.goto('/reloj');
  await page.getByRole('button', { name: 'Descartar' }).first().click();
  await expect(page.getByText('Todavía no hay datos confirmados.')).toBeVisible();
  expect(mock.tables.watch_metrics![0]).toMatchObject({ validation_status: 'rejected' });
});

test('el jugador no accede al registro del reloj', async ({ page }) => {
  await mockSupabase(page);
  await loginAs(page, 'player');
  await page.goto('/reloj');
  await expect(page.getByText('Sección exclusiva de papá')).toBeVisible();
});

import { expect, test, type Page } from '@playwright/test';
import { loginAs, mockSupabase, PLAYER_ID } from './support/mockSupabase';

type Mock = Awaited<ReturnType<typeof mockSupabase>>;

/** Carga un entrenamiento de ejemplo directamente en la simulación. */
function seedWorkout(mock: Mock, extra: Record<string, unknown> = {}) {
  const t = mock.tables;
  const id = crypto.randomUUID();
  const [dominio, plancha] = t.exercises!;
  t.workout_templates!.push({
    id,
    player_id: PLAYER_ID,
    name: 'Técnica y fuerza',
    objective: 'Control y tronco',
    notes: null,
    est_minutes: 15,
    is_template: true,
    scheduled_for: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...extra,
  });
  t.workout_items!.push(
    {
      id: crypto.randomUUID(),
      template_id: id,
      player_id: PLAYER_ID,
      exercise_id: dominio!.id,
      position: 0,
      sets: null,
      reps: null,
      duration_sec: 300,
      rest_sec: null,
      instructions: 'Alternando piernas',
      removed: false,
    },
    {
      id: crypto.randomUUID(),
      template_id: id,
      player_id: PLAYER_ID,
      exercise_id: plancha!.id,
      position: 1,
      sets: 2,
      reps: null,
      duration_sec: 30,
      rest_sec: 30,
      instructions: null,
      removed: false,
    },
  );
  return id;
}

const nav = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Navegación principal' })
    .locator('visible=true')
    .getByRole('link', { name, exact: true })
    .click();

test.describe('Biblioteca de ejercicios', () => {
  test('papá crea, edita y elimina un ejercicio propio', async ({ page }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'admin');
    await page.goto('/entrenar/ejercicios');
    await expect(page.getByText('3 ejercicios')).toBeVisible();

    await page.getByRole('link', { name: 'Nuevo' }).click();
    await page.getByLabel('Nombre').fill('P');
    await page.getByRole('button', { name: 'Crear ejercicio' }).click();
    await expect(page.getByText('Ingresá un nombre (mínimo 2 letras).')).toBeVisible();

    await page.getByLabel('Nombre').fill('Pases largos');
    await page.getByLabel('Categoría').selectOption('technique');
    await page.getByLabel('Paso a paso').fill('Pasá a 15 metros\nControlá y repetí');
    await page.getByLabel('Video o imagen (enlace)').fill('https://example.com/video');
    await page.getByRole('button', { name: 'Crear ejercicio' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Pases largos' })).toBeVisible();
    await expect(page.getByText('Controlá y repetí')).toBeVisible();
    await expect(page.getByText('Propio')).toBeVisible();
    expect(
      mock.tables.exercises!.some((e) => e.name === 'Pases largos' && e.is_custom === true),
    ).toBe(true);

    await page.getByRole('link', { name: 'Editar' }).click();
    await page.getByLabel('Nombre').fill('Pases largos con ambas piernas');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pases largos con ambas piernas' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page).toHaveURL(/\/entrenar\/ejercicios$/);
    await expect(page.getByText('3 ejercicios')).toBeVisible();
  });

  test('el jugador ve la biblioteca, marca favoritos y no puede crear', async ({ page }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'player');
    await page.goto('/entrenar/ejercicios');
    await expect(page.getByRole('link', { name: 'Nuevo' })).toHaveCount(0);

    await page.getByRole('link', { name: /Plancha/ }).click();
    await page.getByRole('button', { name: 'Agregar a favoritos' }).click();
    await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
    expect(mock.tables.exercise_favorites).toHaveLength(1);

    await page.goto('/entrenar/ejercicios?categoria=favoritos');
    await expect(page.getByText('1 ejercicio')).toBeVisible();

    await page.goto('/entrenar/ejercicios/nuevo');
    await expect(page.getByText('Sección exclusiva de papá')).toBeVisible();
  });
});

test('papá arma un entrenamiento, lo reordena, lo duplica y lo elimina', async ({ page }) => {
  const mock = await mockSupabase(page);
  await loginAs(page, 'admin');
  await page.goto('/entrenar');
  await page.getByRole('link', { name: 'Nuevo' }).first().click();

  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page.getByRole('alert')).toContainText('Agregá al menos un ejercicio.');

  await page.getByLabel('Nombre').fill('Coordinación + técnica');
  for (const name of ['Escalera de coordinación', 'Dominio de pelota']) {
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.getByRole('button', { name: `Agregar ${name}` }).click();
  }
  await page.getByRole('button', { name: 'Subir' }).nth(1).click(); // Dominio primero
  await page.getByLabel('Series').first().fill('2');
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();

  await expect(page).toHaveURL(/\/entrenar$/);
  const saved = mock.tables.workout_templates!.find((w) => w.name === 'Coordinación + técnica')!;
  const items = mock.tables.workout_items!.filter((i) => i.template_id === saved.id && !i.removed);
  const exName = (id: unknown) => mock.tables.exercises!.find((e) => e.id === id)!.name;
  expect(items.map((i) => exName(i.exercise_id))).toEqual([
    'Dominio de pelota',
    'Escalera de coordinación',
  ]);
  expect(items[0]!.sets).toBe(2);
  expect(saved.est_minutes).toBe(15); // sugerido: 2×5 + 5

  await page.getByRole('button', { name: /Coordinación \+ técnica/ }).click();
  await page.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue('Coordinación + técnica (copia)');
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page.getByRole('button', { name: /\(copia\)/ })).toBeVisible();

  await page.getByRole('button', { name: /\(copia\)/ }).click();
  await page.getByRole('button', { name: 'Eliminar' }).click();
  await page
    .getByRole('dialog', { name: '¿Eliminar entrenamiento?' })
    .getByRole('button', { name: 'Eliminar' })
    .click();
  await expect(page.getByRole('button', { name: /\(copia\)/ })).toHaveCount(0);
});

test('Benja hace un entrenamiento completo, lo retoma tras cerrar y lo registra', async ({
  page,
}) => {
  const mock = await mockSupabase(page);
  const workoutId = seedWorkout(mock);
  await loginAs(page, 'player');
  await nav(page, 'Entrenar');
  await page.getByRole('button', { name: /Técnica y fuerza/ }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();

  await expect(page.getByRole('heading', { name: 'Dominio de pelota' })).toBeVisible();
  await expect(page.getByText('Alternando piernas')).toBeVisible();
  await page.getByRole('button', { name: 'Ejercicio hecho' }).click();
  await page.getByRole('button', { name: 'Ejercicio siguiente' }).click();

  await expect(page.getByRole('heading', { name: 'Plancha' })).toBeVisible();
  await page.getByRole('button', { name: 'Serie hecha (1 de 2)' }).click();
  await expect(page.getByText('Descanso', { exact: true })).toBeVisible();

  // Se cierra la app en pleno descanso: al volver, retoma donde quedó.
  await page.goto('/');
  await nav(page, 'Entrenar');
  await expect(page.getByText('Entrenamiento sin terminar')).toBeVisible();
  await page.getByRole('link', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(new RegExp(`/entrenar/sesion/${workoutId}$`));
  await expect(page.getByRole('heading', { name: 'Plancha' })).toBeVisible();
  await page.getByRole('button', { name: 'Saltar descanso' }).click();
  await page.getByRole('button', { name: 'Serie hecha (2 de 2)' }).click();

  await page.getByRole('button', { name: 'Terminar' }).click();
  const sheet = page.getByRole('dialog', { name: 'Terminar entrenamiento' });
  await sheet.getByLabel('Duración real (minutos)').fill('18');
  await sheet.getByRole('button', { name: '6: Exigente' }).click();
  await sheet.getByRole('button', { name: '4: Bien' }).click();
  await sheet.getByLabel('Observaciones').fill('Me costó la plancha');
  await sheet.getByRole('button', { name: 'Guardar sesión' }).click();

  await expect(page.getByRole('heading', { name: '¡Sesión registrada!' })).toBeVisible();
  const session = mock.tables.workout_sessions![0]!;
  expect(session).toMatchObject({
    title: 'Técnica y fuerza',
    actual_minutes: 18,
    rpe: 6,
    post_state: 4,
    notes: 'Me costó la plancha',
  });
  const results = mock.tables.session_results!.filter((r) => r.session_id === session.id);
  expect(results.map((r) => [r.completed, r.sets_done])).toEqual([
    [true, 1],
    [true, 2],
  ]);

  await page.getByRole('button', { name: 'Ver historial' }).click();
  await page.getByRole('button', { name: /Técnica y fuerza/ }).click();
  await expect(page.getByRole('dialog').getByText('6/10 · Exigente')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Plancha', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await nav(page, 'Inicio');
  await expect(page.getByText('18').first()).toBeVisible();
  await expect(page.getByText('Técnica y fuerza')).toBeVisible();
});

test('sin conexión, un entrenamiento libre queda guardado y se envía al volver internet', async ({
  page,
  context,
}) => {
  const mock = await mockSupabase(page);
  await loginAs(page, 'player');
  await nav(page, 'Entrenar');
  await expect(page.getByRole('button', { name: 'Registrar entrenamiento libre' })).toBeVisible();

  await context.setOffline(true);
  mock.serverDown = true;
  await page.getByRole('button', { name: 'Registrar entrenamiento libre' }).click();
  const sheet = page.getByRole('dialog', { name: 'Registrar entrenamiento' });
  await sheet.getByLabel('Minutos').fill('60');
  await sheet.getByRole('button', { name: 'Guardar' }).click();

  await expect(
    page.getByText('Guardado en el celular. Se envía al volver internet.'),
  ).toBeVisible();
  await expect(page.getByText('Pendiente')).toBeVisible();
  await expect(page.getByText(/1 registro guardado en el celular/)).toBeVisible();
  expect(mock.tables.workout_sessions).toHaveLength(0);

  mock.serverDown = false;
  await context.setOffline(false);
  await expect(page.getByText('Pendiente')).toHaveCount(0, { timeout: 10_000 });
  expect(mock.tables.workout_sessions).toHaveLength(1);
  expect(mock.tables.workout_sessions![0]).toMatchObject({
    title: 'Entrenamiento del club',
    actual_minutes: 60,
  });
});

test('el jugador no puede armar entrenamientos', async ({ page }) => {
  const mock = await mockSupabase(page);
  seedWorkout(mock);
  await loginAs(page, 'player');
  await page.goto('/entrenar');
  await expect(page.getByRole('link', { name: 'Nuevo' })).toHaveCount(0);
  await page.getByRole('button', { name: /Técnica y fuerza/ }).click();
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  await page.goto('/entrenar/nuevo');
  await expect(page.getByText('Sección exclusiva de papá')).toBeVisible();
});

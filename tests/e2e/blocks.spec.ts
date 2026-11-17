import { expect, test, type Page } from '@playwright/test';
import { loginAs, mockSupabase, PLAYER_ID } from './support/mockSupabase';

type Mock = Awaited<ReturnType<typeof mockSupabase>>;
const ts = () => new Date().toISOString();

/** Entrenamiento de ejemplo con dos módulos: A (x2: Dominio + Plancha) y B (x1: Escalera). */
function seedBlocks(mock: Mock) {
  const [dominio, plancha, escalera] = mock.tables.exercises!;
  const id = crypto.randomUUID();
  mock.tables.workout_templates!.push({
    id,
    player_id: PLAYER_ID,
    name: 'Circuito',
    objective: null,
    notes: null,
    est_minutes: 20,
    is_template: true,
    scheduled_for: null,
    created_at: ts(),
    updated_at: ts(),
  });
  const item = (
    ex: typeof dominio,
    position: number,
    block: number,
    repeats: number,
    name: string | null,
  ) => ({
    id: crypto.randomUUID(),
    template_id: id,
    player_id: PLAYER_ID,
    exercise_id: ex!.id,
    position,
    sets: null,
    reps: null,
    duration_sec: 60,
    rest_sec: null,
    instructions: null,
    block,
    block_repeats: repeats,
    block_name: name,
    removed: false,
  });
  mock.tables.workout_items!.push(
    item(dominio, 0, 0, 2, 'Técnica'),
    item(plancha, 1, 0, 2, 'Técnica'),
    item(escalera, 2, 1, 1, null),
  );
  return id;
}

const addExercise = async (page: Page, moduleName: string, exercise: string) => {
  await page.getByRole('button', { name: `Agregar ejercicio a ${moduleName}` }).click();
  await page.getByRole('button', { name: `Agregar ${exercise}`, exact: true }).click();
};

test('papá arma dos módulos con repeticiones y se guardan bien', async ({ page }) => {
  const mock = await mockSupabase(page);
  await loginAs(page, 'admin');
  await page.goto('/entrenar/nuevo');
  await page.getByLabel('Nombre', { exact: true }).fill('Rutina por módulos');

  // Módulo 1: dos ejercicios, se repite 3 veces
  await page.getByLabel('Nombre del módulo 1').fill('Calentamiento');
  await addExercise(page, 'Calentamiento', 'Dominio de pelota');
  await addExercise(page, 'Calentamiento', 'Plancha');
  await page.getByRole('button', { name: 'Más vueltas de Calentamiento' }).click();
  await page.getByRole('button', { name: 'Más vueltas de Calentamiento' }).click();
  await expect(page.getByText('3 veces')).toBeVisible();

  // Módulo 2: otro ejercicio, 2 veces
  await page.getByRole('button', { name: 'Agregar otro módulo' }).click();
  await addExercise(page, 'Módulo 2', 'Escalera de coordinación');
  await page.getByRole('button', { name: 'Más vueltas de Módulo 2' }).click();

  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page).toHaveURL(/\/entrenar$/);

  const saved = mock.tables.workout_templates!.find((w) => w.name === 'Rutina por módulos')!;
  const items = mock.tables.workout_items!.filter((i) => i.template_id === saved.id && !i.removed);
  const name = (id: unknown) => mock.tables.exercises!.find((e) => e.id === id)!.name;
  expect(items.map((i) => [name(i.exercise_id), i.block, i.block_repeats, i.block_name])).toEqual([
    ['Dominio de pelota', 0, 3, 'Calentamiento'],
    ['Plancha', 0, 3, 'Calentamiento'],
    ['Escalera de coordinación', 1, 2, null],
  ]);
  // Tiempo sugerido: (5 + 4) min × 3 + 5 min × 2 = 37
  expect(saved.est_minutes).toBe(37);
});

test('un módulo vacío avisa y no deja guardar a medias', async ({ page }) => {
  await mockSupabase(page);
  await loginAs(page, 'admin');
  await page.goto('/entrenar/nuevo');
  await page.getByLabel('Nombre', { exact: true }).fill('Con vacío');
  await addExercise(page, 'Módulo 1', 'Plancha');
  await page.getByRole('button', { name: 'Agregar otro módulo' }).click();
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page.getByRole('alert')).toContainText('Módulo 2 no tiene ejercicios');
});

test('editar es simple: cambiar vueltas, mover, duplicar y quitar módulos', async ({ page }) => {
  const mock = await mockSupabase(page);
  const id = seedBlocks(mock);
  await loginAs(page, 'admin');
  await page.goto(`/entrenar/${id}/editar`);

  // Se ven los dos módulos con sus vueltas
  await expect(page.getByLabel('Nombre del módulo 1')).toHaveValue('Técnica');
  await expect(page.getByText('2 veces')).toBeVisible();
  await expect(page.getByText('1 vez', { exact: true })).toBeVisible();

  // Menos vueltas y más vueltas
  await page.getByRole('button', { name: 'Menos vueltas de Técnica' }).click();
  await expect(page.getByRole('button', { name: 'Menos vueltas de Técnica' })).toBeDisabled();
  await page.getByRole('button', { name: 'Más vueltas de Módulo 2' }).click();
  await page.getByRole('button', { name: 'Más vueltas de Módulo 2' }).click();

  // Mover un ejercicio dentro del módulo
  await page.getByRole('button', { name: 'Bajar Dominio de pelota' }).click();

  // Duplicar el módulo 2 y quitar el original
  await page.getByRole('button', { name: 'Duplicar Módulo 2' }).click();
  await expect(page.getByLabel(/Nombre del módulo/)).toHaveCount(3);
  await page.getByRole('button', { name: 'Quitar Módulo 2' }).first().click();
  await page.getByRole('button', { name: 'Sí, quitar' }).click();
  await expect(page.getByLabel(/Nombre del módulo/)).toHaveCount(2);

  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page).toHaveURL(/\/entrenar$/);

  const active = mock.tables.workout_items!.filter((i) => i.template_id === id && !i.removed);
  const name = (x: unknown) => mock.tables.exercises!.find((e) => e.id === x)!.name;
  expect(active.map((i) => [name(i.exercise_id), i.block, i.block_repeats])).toEqual([
    ['Plancha', 0, 1],
    ['Dominio de pelota', 0, 1],
    ['Escalera de coordinación', 1, 3],
  ]);
});

test('modo entrenamiento: recorre el módulo completo tantas vueltas como indique', async ({
  page,
}) => {
  const mock = await mockSupabase(page);
  const id = seedBlocks(mock);
  await loginAs(page, 'player');
  await page.goto(`/entrenar/sesion/${id}`);

  const next = () => page.getByRole('button', { name: 'Ejercicio siguiente' }).click();
  const title = (t: string) =>
    expect(page.getByRole('heading', { level: 1, name: t })).toBeVisible();

  // Módulo "Técnica" × 2: Dominio, Plancha, Dominio, Plancha — luego la Escalera
  await title('Dominio de pelota');
  await expect(page.getByText('Ejercicio 1 de 5')).toBeVisible();
  await expect(page.getByText('Técnica · vuelta 1 de 2')).toBeVisible();
  await next();
  await title('Plancha');
  await expect(page.getByText('vuelta 1 de 2')).toBeVisible();
  await next();
  await title('Dominio de pelota');
  await expect(page.getByText('Técnica · vuelta 2 de 2')).toBeVisible();
  await next();
  await title('Plancha');
  await expect(page.getByText('vuelta 2 de 2')).toBeVisible();
  await next();
  await title('Escalera de coordinación');
  await expect(page.getByText('Ejercicio 5 de 5')).toBeVisible();
  await expect(page.getByText(/vuelta/)).toHaveCount(0); // 1 sola vuelta: no se muestra

  // Terminar: un resultado por ejercicio, completo solo si se hizo en todas las vueltas
  await page.getByRole('button', { name: 'Terminar' }).click();
  const sheet = page.getByRole('dialog', { name: 'Terminar entrenamiento' });
  await sheet.getByLabel('Duración real (minutos)').fill('15');
  await sheet.getByRole('button', { name: 'Guardar sesión' }).click();
  await expect(page.getByRole('heading', { name: '¡Sesión registrada!' })).toBeVisible();

  const session = mock.tables.workout_sessions![0]!;
  const results = mock.tables.session_results!.filter((r) => r.session_id === session.id);
  expect(results).toHaveLength(3); // 3 ejercicios del entrenamiento, no 5 pasos
});

import { expect, test } from '@playwright/test';
import { loginAs, mockSupabase, PLAYER_ID } from './support/mockSupabase';

test.describe('Partidos', () => {
  test('Benja registra un partido con estadísticas y evaluación; lo no cargado queda vacío', async ({
    page,
  }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'player');
    await page.goto('/partidos');
    await expect(page.getByText('Todavía no hay partidos')).toBeVisible();

    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Registrar partido' });
    await sheet.getByRole('button', { name: 'Guardar partido' }).click();
    await expect(sheet.getByText('Poné el nombre del rival.')).toBeVisible();

    await sheet.getByLabel('Rival').fill('Club Sur');
    await sheet.getByLabel('Goles a favor').fill('3');
    await sheet.getByLabel('Goles en contra').fill('1');
    await sheet.getByLabel('Minutos jugados').fill('40');
    await sheet.getByLabel('Goles', { exact: true }).fill('1');
    await sheet.getByLabel('Tiros', { exact: true }).fill('2');
    await sheet.getByLabel('Tiros al arco').fill('5');
    await sheet.getByRole('button', { name: 'Guardar partido' }).click();
    await expect(
      sheet.getByText('Los tiros al arco no pueden ser más que los tiros.'),
    ).toBeVisible();

    await sheet.getByLabel('Tiros al arco').fill('1');
    await sheet.getByRole('button', { name: '4: Bien' }).first().click();
    await sheet.getByLabel('¿Qué hice bien?').fill('Pedí la pelota');
    await sheet.getByRole('button', { name: 'Guardar partido' }).click();

    await expect(page.getByText('vs Club Sur')).toBeVisible();
    await expect(page.getByText('3 - 1')).toBeVisible();
    await expect(page.getByText('Ganó')).toBeVisible();
    expect(mock.tables.matches).toHaveLength(1);
    expect(mock.tables.match_statistics![0]).toMatchObject({ goals: 1, shots: 2, assists: null });
    expect(mock.tables.match_reflections![0]).toMatchObject({ did_well: 'Pedí la pelota' });

    // Temporada: asistencias sin registrar siguen vacías (no cero)
    await expect(page.getByText('Solo se suma lo que se registró')).toBeVisible();

    await page.getByRole('button', { name: /vs Club Sur/ }).click();
    await expect(page.getByText('Pedí la pelota')).toBeVisible();
    await expect(page.getByText('Asistencias', { exact: true }).last()).toBeVisible();
  });

  test('editar un partido no lo duplica y quitarlo lo marca (no se borra)', async ({ page }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'admin');
    await page.goto('/partidos');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Registrar partido' });
    await sheet.getByLabel('Rival').fill('Club Norte');
    await sheet.getByRole('button', { name: 'Guardar partido' }).click();
    await page.getByRole('button', { name: /vs Club Norte/ }).click();

    await page.getByRole('button', { name: 'Editar' }).click();
    const edit = page.getByRole('dialog', { name: 'Editar partido' });
    await edit.getByLabel('Rival').fill('Club Norte B');
    await edit.getByRole('button', { name: 'Guardar partido' }).click();
    await expect(page.getByText('vs Club Norte B')).toBeVisible();
    expect(mock.tables.matches).toHaveLength(1);

    await page.getByRole('button', { name: /vs Club Norte B/ }).click();
    await page.getByRole('button', { name: 'Quitar' }).click();
    await page.getByRole('button', { name: 'Confirmar: quitar partido' }).click();
    await expect(page.getByText('Todavía no hay partidos')).toBeVisible();
    expect(mock.tables.matches![0]).toMatchObject({ removed: true });
  });

  test('sin conexión, el partido queda pendiente y se envía al volver internet', async ({
    page,
    context,
  }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'player');
    await page.goto('/partidos');
    await expect(page.getByText('Todavía no hay partidos')).toBeVisible();
    await context.setOffline(true);
    mock.serverDown = true;
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Registrar partido' });
    await sheet.getByLabel('Rival').fill('Club Oeste');
    await sheet.getByRole('button', { name: 'Guardar partido' }).click();
    await expect(page.getByText('vs Club Oeste')).toBeVisible();
    await expect(page.getByText('Pendiente')).toBeVisible();
    expect(mock.tables.matches).toHaveLength(0);

    mock.serverDown = false;
    await context.setOffline(false);
    await expect(page.getByText('Pendiente')).toHaveCount(0, { timeout: 10_000 });
    expect(mock.tables.matches).toHaveLength(1);
    await expect(page.getByText('vs Club Oeste')).toHaveCount(1);
  });
});

test.describe('Bienestar y semáforo', () => {
  test('el semáforo cambia según lo que se carga y avisa en rojo', async ({ page }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'player');
    await page.goto('/recuperacion');
    await expect(page.getByText('Sin registros de bienestar')).toBeVisible();

    await page.getByRole('button', { name: 'Registrar hoy' }).first().click();
    const sheet = page.getByRole('dialog', { name: '¿Cómo estás hoy?' });
    await expect(sheet.getByText('El semáforo aparece cuando completes algún dato.')).toBeVisible();
    await sheet.getByRole('button', { name: 'Guardar' }).click();
    await expect(sheet.getByText('Completá al menos un dato para guardar.')).toBeVisible();

    await sheet.getByLabel('Horas de sueño').fill('9.5');
    await sheet.getByRole('button', { name: '4: Bueno' }).first().click();
    await expect(sheet.getByText('Semáforo: Verde.')).toBeVisible();
    await sheet.getByLabel('Molestias (dónde y cómo)').fill('Me duele el tobillo');
    await expect(sheet.getByText('Semáforo: Amarillo.')).toBeVisible();
    await sheet.getByLabel('Dolor').selectOption('2');
    await expect(sheet.getByText('Semáforo: Rojo.')).toBeVisible();
    await sheet.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Hoy el semáforo está en rojo')).toBeVisible();
    expect(mock.tables.wellness_logs).toHaveLength(1);
    expect(mock.tables.wellness_logs![0]).toMatchObject({ traffic_light: 'red', pain_level: 2 });

    // Editar el mismo día no crea otro registro
    await page.getByRole('button', { name: 'Editar hoy' }).click();
    const again = page.getByRole('dialog', { name: '¿Cómo estás hoy?' });
    await again.getByLabel('Dolor').selectOption('0');
    await again.getByLabel('Molestias (dónde y cómo)').fill('');
    await again.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Hoy el semáforo está en rojo')).toHaveCount(0);
    expect(mock.tables.wellness_logs).toHaveLength(1);
    await expect.poll(() => mock.tables.wellness_logs![0]?.traffic_light).toBe('green');
  });
});

test.describe('Objetivos y evaluaciones', () => {
  test('Benja propone un objetivo, papá lo aprueba y Benja ya no puede cambiarlo', async ({
    page,
    browser,
  }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'player');
    await page.goto('/objetivos');
    await page.getByRole('button', { name: 'Proponer' }).click();
    const sheet = page.getByRole('dialog', { name: 'Proponer un objetivo' });
    await sheet.getByRole('button', { name: 'Proponer a papá' }).click();
    await expect(sheet.getByText('Poné un nombre (mínimo 2 letras).')).toBeVisible();
    await sheet
      .getByRole('textbox', { name: 'Objetivo', exact: true })
      .fill('Mejorar la pierna izquierda');
    await sheet.getByRole('button', { name: 'Proponer a papá' }).click();

    await expect(page.getByText('Mejorar la pierna izquierda')).toBeVisible();
    await expect(page.getByText('Esperando a papá')).toBeVisible();
    await page.getByRole('button', { name: /Marcar .* al 50%/ }).click();
    await expect(page.getByText('50%', { exact: true }).first()).toBeVisible();
    expect(mock.tables.goals![0]).toMatchObject({
      progress: 50,
      status: 'in_progress',
      approved: false,
    });
    await expect(page.getByRole('button', { name: 'Aprobar' })).toHaveCount(0);

    // Papá (otra sesión sobre la misma "base") aprueba
    mock.tables.goals![0]!.approved = true;
    await page.reload();
    await expect(page.getByText('Esperando a papá')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Marcar .* al 75%/ })).toHaveCount(0);
    void browser;
  });

  test('papá crea un objetivo aprobado y lo completa', async ({ page }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'admin');
    await page.goto('/objetivos');
    await page.getByRole('button', { name: 'Nuevo' }).click();
    await page
      .getByRole('dialog')
      .getByRole('textbox', { name: 'Objetivo', exact: true })
      .fill('Dominar 50 toques');
    await page.getByRole('button', { name: 'Crear objetivo' }).click();
    await expect(page.getByText('Dominar 50 toques')).toBeVisible();
    expect(mock.tables.goals![0]).toMatchObject({ approved: true, player_id: PLAYER_ID });
    await page.getByRole('button', { name: /Marcar .* al 100%/ }).click();
    await expect(page.getByRole('heading', { name: 'Completados' })).toBeVisible();
    expect(mock.tables.goals![0]).toMatchObject({ status: 'completed', progress: 100 });
  });

  test('papá carga una evaluación física; Benja la ve pero no puede cargar', async ({ page }) => {
    const mock = await mockSupabase(page);
    await loginAs(page, 'admin');
    await page.goto('/objetivos');
    await page.getByRole('tab', { name: 'Evaluaciones' }).click();
    await page.getByRole('button', { name: 'Evaluar' }).click();
    const sheet = page.getByRole('dialog', { name: 'Nueva evaluación física' });
    await sheet.getByRole('button', { name: 'Guardar evaluación' }).click();
    await expect(sheet.getByText(/nombre de la prueba/)).toBeVisible();
    await sheet.getByLabel('Prueba').fill('Carrera de 20 m');
    await sheet.getByLabel('Resultado').fill('4,2');
    await sheet.getByLabel('Unidad').fill('s');
    await sheet.getByRole('button', { name: '7', exact: true }).click();
    await sheet.getByRole('button', { name: 'Guardar evaluación' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: /Quitar evaluación/ })).toBeVisible();
    expect(mock.tables.assessments![0]).toMatchObject({
      test_name: 'Carrera de 20 m',
      value: 4.2,
      score: 7,
    });

    await page.getByRole('button', { name: /Quitar evaluación/ }).click();
    await expect(page.getByText('Todavía no hay evaluaciones')).toBeVisible();
    expect(mock.tables.assessments![0]).toMatchObject({ removed: true });
  });

  test('el jugador ve las evaluaciones pero no tiene el botón para cargar', async ({ page }) => {
    const mock = await mockSupabase(page);
    mock.tables.assessments!.push({
      id: crypto.randomUUID(),
      player_id: PLAYER_ID,
      assessed_on: '2026-11-01',
      dimension: 'speed',
      test_name: 'Carrera de 20 m',
      value: 4.2,
      unit: 's',
      score: 7,
      notes: null,
      removed: false,
      created_at: new Date().toISOString(),
    });
    await loginAs(page, 'player');
    await page.goto('/objetivos');
    await page.getByRole('tab', { name: 'Evaluaciones' }).click();
    await expect(page.getByText('Carrera de 20 m').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Evaluar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Quitar evaluación/ })).toHaveCount(0);
  });
});

test('el Inicio muestra datos reales de partidos, objetivos y bienestar', async ({ page }) => {
  const mock = await mockSupabase(page);
  const today = new Date().toISOString().slice(0, 10);
  const ts = new Date().toISOString();
  mock.tables.goals!.push({
    id: crypto.randomUUID(),
    player_id: PLAYER_ID,
    name: 'Mejorar pases',
    description: null,
    start_date: today,
    target_date: null,
    progress: 30,
    status: 'in_progress',
    approved: true,
    removed: false,
    created_at: ts,
    updated_at: ts,
  });
  mock.tables.wellness_logs!.push({
    id: crypto.randomUUID(),
    player_id: PLAYER_ID,
    log_date: today,
    sleep_hours: 9,
    energy: 4,
    pain_level: 0,
    sick: false,
    traffic_light: 'green',
    client_id: crypto.randomUUID(),
    created_at: ts,
    updated_at: ts,
  });
  await loginAs(page, 'player');
  await expect(page.getByText('1 en curso')).toBeVisible();
  await expect(page.getByText('Mejorar pases')).toBeVisible();
  await expect(page.getByText('Semáforo verde')).toBeVisible();
});

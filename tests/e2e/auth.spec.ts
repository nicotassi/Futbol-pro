import { expect, test } from '@playwright/test';
import { accounts, loginAs, mockSupabase } from './support/mockSupabase';

const greeting = /Buen día|Buenas tardes|Buenas noches/;

test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
});

test('sin sesión, cualquier pantalla lleva al ingreso', async ({ page }) => {
  await page.goto('/evolucion');
  await expect(page).toHaveURL(/\/ingresar$/);
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});

test('contraseña incorrecta muestra un mensaje claro', async ({ page }) => {
  await page.goto('/ingresar');
  await page.getByLabel('Usuario o email').fill('benja');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.');
  await expect(page).toHaveURL(/\/ingresar$/);
});

test('usuario con caracteres inválidos se valida antes de enviar', async ({ page }) => {
  await page.goto('/ingresar');
  await page.getByLabel('Usuario o email').fill('ben ja!');
  await page.getByLabel('Contraseña', { exact: true }).fill('algo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('El usuario solo puede tener');
});

test('después de ingresar vuelve a la pantalla pedida', async ({ page }) => {
  await page.goto('/calendario');
  await expect(page).toHaveURL(/\/ingresar$/);
  await page.getByLabel('Usuario o email').fill(accounts.player.login);
  await page.getByLabel('Contraseña', { exact: true }).fill(accounts.player.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/calendario$/);
});

test.describe('Benja (jugador)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'player');
  });

  test('ve su dashboard con los datos de la base', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: greeting })).toContainText('Benja');
    await expect(page.getByText(/^Mediocampista · \d+ años$/)).toBeVisible();
    // Subir capturas del reloj es tarea de papá.
    await expect(page.getByRole('link', { name: /Subir captura del reloj/ })).toHaveCount(0);
  });

  test('no puede entrar a Administración ni al Registro del reloj', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Sección exclusiva de papá')).toBeVisible();
    await page.goto('/reloj');
    await expect(page.getByText('Sección exclusiva de papá')).toBeVisible();
  });

  test('ve su perfil sin opción de editarlo', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page.getByText('Usuario: benja')).toBeVisible();
    await expect(page.getByText('Jugador', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0);
  });

  test('la sesión se mantiene al recargar y se borra al cerrar sesión', async ({ page }) => {
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: greeting })).toBeVisible();

    await page.goto('/perfil');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/ingresar$/);
    const stored = await page.evaluate(() => localStorage.getItem('fp-auth'));
    expect(stored).toBeNull();
  });
});

test.describe('Papá (administrador)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('ve su saludo y a quién acompaña', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: greeting })).toContainText('Nico');
    await expect(page.getByText(/Seguimiento de Benja/)).toBeVisible();
  });

  test('ve los usuarios con acceso en Administración', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible();
    await expect(page.getByText('Nico (vos)')).toBeVisible();
    await expect(page.getByText('Usuario: benja')).toBeVisible();
  });

  test('edita el perfil del jugador con validación', async ({ page }) => {
    await page.goto('/perfil');
    await page.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Perfil del jugador' });

    await dialog.getByLabel('Nombre', { exact: true }).fill('');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(dialog.getByText('Ingresá el nombre.')).toBeVisible();

    await dialog.getByLabel('Nombre', { exact: true }).fill('Benjamín');
    await dialog.getByLabel('Club').fill('Club Social');
    await dialog.getByLabel('Pierna hábil').selectOption('left');
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Benjamín', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Club Social')).toBeVisible();
    await expect(page.getByText('Izquierdo')).toBeVisible();
  });
});

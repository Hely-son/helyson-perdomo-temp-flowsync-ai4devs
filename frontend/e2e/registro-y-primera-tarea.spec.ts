import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

// El único recorrido de extremo a extremo: lo que solo se rompe cuando varias
// piezas se pasan algo entre ellas (formulario → API → sesión → lista). Los
// estados de cada pieza (filtros, cambio de estado, errores) se comprueban en
// sus historias, no aquí.
test('una persona sin cuenta se registra, escribe una tarea y la ve en la lista', async ({
  page,
}) => {
  // Cada ejecución crea una cuenta y una tarea que no han existido nunca: un
  // correo repetido chocaría con el registro del pase anterior, y un título
  // repetido encontraría la tarea de otra ejecución en la lista compartida.
  const id = randomUUID()
  const email = `e2e-${id}@example.com`
  const password = 'clave-de-prueba-e2e'
  const titulo = `Revisar el informe ${id}`

  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Repite la contraseña').fill(password)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  await expect(
    page.getByRole('heading', { name: 'Tareas del equipo' }),
  ).toBeVisible()

  await page.getByLabel('Título de la tarea').fill(titulo)
  await page.getByRole('button', { name: 'Crear tarea' }).click()

  await expect(
    page.getByRole('listitem').filter({ hasText: titulo }),
  ).toBeVisible()
})

import { defineConfig, devices } from '@playwright/test'

// El recorrido necesita la aplicación entera en marcha (`make start`: base de
// datos, backend en :3333 y frontend en :5173). Esta configuración no arranca
// nada por su cuenta. Para apuntar a otra dirección: E2E_BASE_URL=... make test-web
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})

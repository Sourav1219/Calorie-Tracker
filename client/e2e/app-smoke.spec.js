import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/Welcome back/i)).toBeVisible();
});

test("backend health endpoint is reachable", async ({ request }) => {
  const backendUrl = process.env.E2E_API_URL || "http://localhost:5001/";
  const response = await request.get(backendUrl);
  expect(response.ok()).toBeTruthy();
});

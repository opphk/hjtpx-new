import { test, expect } from '@playwright/test';

test.describe('用户管理测试', () => {
  test('未登录时访问用户管理页面应重定向到登录页', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/login/);
  });

  test('用户管理页面受保护路由验证', async ({ page }) => {
    const response = await page.goto('/admin/users');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/login/);
  });

  test('登录页面正常显示', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=欢迎回来')).toBeVisible();
    await expect(page.locator('form.auth-form')).toBeVisible();
  });

  test('注册页面正常显示', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('text=创建账户')).toBeVisible();
    await expect(page.locator('form.auth-form')).toBeVisible();
  });

  test('仪表盘路由受保护验证', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});

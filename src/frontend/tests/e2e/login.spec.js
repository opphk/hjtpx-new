const { test, expect } = require('@playwright/test');

test.describe('登录流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('应该能够成功登录并跳转到仪表板', async ({ page }) => {
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: '仪表板' })).toBeVisible();
  });

  test('应该显示登录错误信息当凭据无效时', async ({ page }) => {
    await page.getByLabel('用户名').fill('invalid');
    await page.getByLabel('密码').fill('wrongpass');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('用户名或密码错误')).toBeVisible();
  });

  test('应该验证必填字段', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: '登录' });
    await expect(loginButton).toBeDisabled();
    await page.getByLabel('用户名').fill('admin');
    await expect(loginButton).toBeDisabled();
    await page.getByLabel('密码').fill('password');
    await expect(loginButton).toBeEnabled();
  });
});

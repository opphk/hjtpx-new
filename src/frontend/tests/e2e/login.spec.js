import { test, expect } from '@playwright/test';

test.describe('登录流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('页面应该正确加载并显示登录表单', async ({ page }) => {
    await expect(page).toHaveTitle(/登录/);
    await expect(page.locator('text=欢迎回来')).toBeVisible();
    await expect(page.locator('form.auth-form')).toBeVisible();
  });

  test('应该验证必填字段', async ({ page }) => {
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.locator('text=邮箱不能为空')).toBeVisible();
    await expect(page.locator('text=密码不能为空')).toBeVisible();
  });

  test('应该验证邮箱格式', async ({ page }) => {
    await page.getByLabel('邮箱').fill('invalid-email');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible();
  });

  test('应该验证密码长度', async ({ page }) => {
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('short');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.locator('text=密码至少8个字符')).toBeVisible();
  });

  test('应该显示导航链接到注册页面', async ({ page }) => {
    await expect(page.locator('text=还没有账户？')).toBeVisible();
    const registerLink = page.locator('a', { hasText: '立即注册' });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });
});

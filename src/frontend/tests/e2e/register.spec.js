import { test, expect } from '@playwright/test';

test.describe('注册流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('页面应该正确加载并显示注册表单', async ({ page }) => {
    await expect(page).toHaveTitle(/注册/);
    await expect(page.locator('text=创建账户')).toBeVisible();
    await expect(page.locator('form.auth-form')).toBeVisible();
  });

  test('应该验证必填字段', async ({ page }) => {
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('text=用户名不能为空')).toBeVisible();
    await expect(page.locator('text=邮箱不能为空')).toBeVisible();
    await expect(page.locator('text=密码不能为空')).toBeVisible();
  });

  test('应该验证用户名长度', async ({ page }) => {
    await page.getByLabel('用户名').fill('a');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('Password123');
    await page.getByLabel('确认密码').fill('Password123');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('text=用户名至少2个字符')).toBeVisible();
  });

  test('应该验证邮箱格式', async ({ page }) => {
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('邮箱').fill('invalid-email');
    await page.getByLabel('密码').fill('Password123');
    await page.getByLabel('确认密码').fill('Password123');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible();
  });

  test('应该验证密码长度', async ({ page }) => {
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('Short1');
    await page.getByLabel('确认密码').fill('Short1');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('text=密码至少8个字符')).toBeVisible();
  });

  test('应该验证密码强度', async ({ page }) => {
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('password123');
    await page.getByLabel('确认密码').fill('password123');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('text=密码必须包含至少一个大写字母、一个小写字母和一个数字')).toBeVisible();
  });

  test('应该验证密码确认匹配', async ({ page }) => {
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('Password123');
    await page.getByLabel('确认密码').fill('Password456');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('text=两次输入的密码不一致')).toBeVisible();
  });

  test('应该显示导航链接到登录页面', async ({ page }) => {
    await expect(page.locator('text=已有账户？')).toBeVisible();
    const loginLink = page.locator('a', { hasText: '立即登录' });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });
});

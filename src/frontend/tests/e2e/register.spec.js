const { test, expect } = require('@playwright/test');

test.describe('注册流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('应该能够成功注册新用户', async ({ page }) => {
    const timestamp = Date.now();
    await page.getByLabel('用户名').fill(`testuser${timestamp}`);
    await page.getByLabel('邮箱').fill(`test${timestamp}@example.com`);
    await page.getByLabel('密码').fill('Password123!');
    await page.getByLabel('确认密码').fill('Password123!');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.getByText('注册成功')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/login');
  });

  test('应该验证密码确认匹配', async ({ page }) => {
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('Password123!');
    await page.getByLabel('确认密码').fill('DifferentPass123!');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.getByText('两次输入的密码不一致')).toBeVisible();
  });

  test('应该验证邮箱格式', async ({ page }) => {
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('邮箱').fill('invalid-email');
    await page.getByLabel('密码').fill('Password123!');
    await page.getByLabel('确认密码').fill('Password123!');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.getByText('请输入有效的邮箱地址')).toBeVisible();
  });

  test('应该验证密码强度要求', async ({ page }) => {
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('weak');
    await page.getByLabel('确认密码').fill('weak');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.getByText('密码长度至少8位，包含大小写字母和数字')).toBeVisible();
  });

  test('应该验证用户名唯一性', async ({ page }) => {
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('邮箱').fill('admin@example.com');
    await page.getByLabel('密码').fill('Password123!');
    await page.getByLabel('确认密码').fill('Password123!');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.getByText('用户名已存在')).toBeVisible();
  });
});

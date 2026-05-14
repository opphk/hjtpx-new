const { test, expect } = require('@playwright/test');

test.describe('用户管理测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('/dashboard');
    await page.goto('/users');
  });

  test('应该显示用户列表页面', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('应该能够搜索用户', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索用户...');
    await searchInput.fill('admin');
    await page.waitForTimeout(500);
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    await expect(rows.first()).toContainText('admin');
  });

  test('应该能够按用户名筛选用户', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: '用户名' });
    await filterButton.click();
    await expect(page.getByText('升序')).toBeVisible();
    await expect(page.getByText('降序')).toBeVisible();
  });

  test('应该能够分页浏览用户', async ({ page }) => {
    const pagination = page.locator('.pagination');
    if (await pagination.isVisible()) {
      const nextButton = page.getByRole('button', { name: '下一页' });
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        await expect(page.getByText('第 2 页')).toBeVisible();
      }
    }
  });

  test('应该能够查看用户详情', async ({ page }) => {
    const firstUserRow = page.locator('tbody tr').first();
    const viewButton = firstUserRow.getByRole('button', { name: '查看' });
    await viewButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('用户详情')).toBeVisible();
  });

  test('应该能够创建新用户', async ({ page }) => {
    await page.getByRole('button', { name: '添加用户' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('用户名').fill('newuser');
    await page.getByLabel('邮箱').fill('newuser@example.com');
    await page.getByLabel('角色').selectOption('user');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('用户创建成功')).toBeVisible();
  });

  test('应该能够编辑用户信息', async ({ page }) => {
    const firstUserRow = page.locator('tbody tr').first();
    const editButton = firstUserRow.getByRole('button', { name: '编辑' });
    await editButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const roleSelect = page.locator('select[name="role"]');
    await roleSelect.selectOption('editor');
    await page.getByRole('button', { name: '更新' }).click();
    await expect(page.getByText('用户更新成功')).toBeVisible();
  });

  test('应该能够删除用户', async ({ page }) => {
    const initialRows = page.locator('tbody tr');
    const initialCount = await initialRows.count();
    const lastUserRow = initialRows.last();
    const deleteButton = lastUserRow.getByRole('button', { name: '删除' });
    await deleteButton.click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);
    await expect(page.getByText('用户删除成功')).toBeVisible();
    const finalRows = page.locator('tbody tr');
    const finalCount = await finalRows.count();
    expect(finalCount).toBe(initialCount - 1);
  });
});

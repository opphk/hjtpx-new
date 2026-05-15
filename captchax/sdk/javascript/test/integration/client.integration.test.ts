import { CaptchaXClient } from '../../src';
import { startTestServer, getRequestCount, clearAllMocks } from './test-server';

const TEST_SERVER_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_SERVER_PORT}`;
const APP_ID = 'integration-test-app';

describe('CaptchaXClient - Integration Tests', () => {
  let client: CaptchaXClient;

  beforeAll(async () => {
    await startTestServer(TEST_SERVER_PORT);
  });

  beforeEach(() => {
    client = new CaptchaXClient({
      baseUrl: BASE_URL,
      appId: APP_ID,
      timeout: 5000,
      retryTimes: 1,
    });
    clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await client.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('captchax-test');
      expect(health.version).toBe('1.0.0-test');
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Slider Captcha Integration', () => {
    it('should generate slider captcha with default options', async () => {
      const captcha = await client.generateSliderCaptcha();

      expect(captcha.id).toBeDefined();
      expect(captcha.id).toMatch(/^slider-\d+-[a-z0-9]+$/);
      expect(captcha.background_b64).toBeDefined();
      expect(captcha.slider_b64).toBeDefined();
      expect(typeof captcha.target_x).toBe('number');
      expect(typeof captcha.target_y).toBe('number');
    });

    it('should generate slider captcha with custom options', async () => {
      const captcha = await client.generateSliderCaptcha({
        width: 400,
        height: 300,
        clientInfo: 'integration-test',
        scenarioId: 'test-scenario',
      });

      expect(captcha.id).toBeDefined();
    });

    it('should verify slider captcha successfully', async () => {
      const captcha = await client.generateSliderCaptcha();

      const result = await client.verifySliderCaptcha(
        captcha.id,
        captcha.target_x,
        captcha.target_y
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification successful');
    });

    it('should fail verification with wrong position', async () => {
      const captcha = await client.generateSliderCaptcha();

      const result = await client.verifySliderCaptcha(
        captcha.id,
        captcha.target_x + 50,
        captcha.target_y + 50
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Verification failed');
    });

    it('should throw error for invalid captcha ID', async () => {
      await expect(
        client.verifySliderCaptcha('non-existent-id', 100, 100)
      ).rejects.toThrow();
    });
  });

  describe('Click Captcha Integration', () => {
    it('should generate click captcha with default options', async () => {
      const captcha = await client.generateClickCaptcha();

      expect(captcha.id).toBeDefined();
      expect(captcha.image).toBeDefined();
      expect(captcha.target_chars.length).toBe(3);
      expect(captcha.char_positions.length).toBe(3);
    });

    it('should generate click captcha with custom char count', async () => {
      const captcha = await client.generateClickCaptcha({
        charCount: 5,
      });

      expect(captcha.target_chars.length).toBe(5);
      expect(captcha.char_positions.length).toBe(5);
    });

    it('should verify click captcha with correct positions', async () => {
      const captcha = await client.generateClickCaptcha();

      const clicks = captcha.char_positions.map((pos) => ({
        char: pos.char,
        x: pos.x,
        y: pos.y,
      }));

      const result = await client.verifyClickCaptcha(captcha.id, clicks);

      expect(result.success).toBe(true);
      expect(result.score).toBe(1);
    });

    it('should verify click captcha with approximate positions', async () => {
      const captcha = await client.generateClickCaptcha();

      const clicks = captcha.char_positions.map((pos) => ({
        char: pos.char,
        x: pos.x + 5,
        y: pos.y + 5,
      }));

      const result = await client.verifyClickCaptcha(captcha.id, clicks);

      expect(result.score).toBeGreaterThanOrEqual(0.8);
    });

    it('should fail verification with wrong positions', async () => {
      const captcha = await client.generateClickCaptcha();

      const wrongClicks = [
        { char: 'X', x: 1, y: 1 },
        { char: 'Y', x: 2, y: 2 },
        { char: 'Z', x: 3, y: 3 },
      ];

      const result = await client.verifyClickCaptcha(captcha.id, wrongClicks);

      expect(result.success).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('Puzzle Captcha Integration', () => {
    it('should generate puzzle captcha', async () => {
      const captcha = await client.generatePuzzleCaptcha();

      expect(captcha.id).toBeDefined();
      expect(captcha.background_b64).toBeDefined();
      expect(captcha.puzzle_b64).toBeDefined();
      expect(typeof captcha.target_x).toBe('number');
      expect(typeof captcha.target_y).toBe('number');
    });

    it('should generate puzzle captcha with custom size', async () => {
      const captcha = await client.generatePuzzleCaptcha({
        width: 500,
        height: 400,
      });

      expect(captcha.id).toBeDefined();
    });

    it('should verify puzzle captcha successfully', async () => {
      const captcha = await client.generatePuzzleCaptcha();

      const result = await client.verifyPuzzleCaptcha(
        captcha.id,
        captcha.target_x,
        captcha.target_y
      );

      expect(result.success).toBe(true);
    });

    it('should fail puzzle verification with wrong position', async () => {
      const captcha = await client.generatePuzzleCaptcha();

      const result = await client.verifyPuzzleCaptcha(
        captcha.id,
        captcha.target_x + 100,
        captcha.target_y + 100
      );

      expect(result.success).toBe(false);
    });
  });

  describe('Batch Verification Integration', () => {
    it('should verify multiple captchas in batch', async () => {
      const slider = await client.generateSliderCaptcha();
      const click = await client.generateClickCaptcha();
      const puzzle = await client.generatePuzzleCaptcha();

      const result = await client.batchVerify([
        { captcha_id: slider.id, type: 'slider', target_x: slider.target_x },
        { captcha_id: click.id, type: 'click', target_x: 0, clicks: click.char_positions },
        { captcha_id: puzzle.id, type: 'puzzle', target_x: puzzle.target_x },
      ]);

      expect(result.summary.total).toBe(3);
      expect(result.results.length).toBe(3);
    });

    it('should handle empty batch', async () => {
      const result = await client.batchVerify([]);

      expect(result.summary.total).toBe(0);
      expect(result.results.length).toBe(0);
    });

    it('should handle mixed success and failure in batch', async () => {
      const slider = await client.generateSliderCaptcha();

      const result = await client.batchVerify([
        { captcha_id: slider.id, type: 'slider', target_x: slider.target_x },
        { captcha_id: slider.id, type: 'slider', target_x: slider.target_x + 100 },
      ]);

      expect(result.summary.total).toBe(2);
      expect(result.summary.success).toBeGreaterThanOrEqual(1);
      expect(result.summary.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scenario Management Integration', () => {
    it('should create a scenario', async () => {
      const scenario = await client.createScenario({
        name: 'Test Scenario',
        description: 'Integration test scenario',
        difficulty: 'medium',
      });

      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.description).toBe('Integration test scenario');
      expect(scenario.difficulty).toBe('medium');
      expect(scenario.created_at).toBeDefined();
      expect(scenario.updated_at).toBeDefined();
    });

    it('should list scenarios', async () => {
      await client.createScenario({ name: 'Scenario 1' });
      await client.createScenario({ name: 'Scenario 2' });

      const result = await client.listScenarios();

      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.scenarios.length).toBeGreaterThanOrEqual(2);
    });

    it('should get a scenario by ID', async () => {
      const created = await client.createScenario({ name: 'Get Test' });

      const retrieved = await client.getScenario(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Get Test');
    });

    it('should update a scenario', async () => {
      const created = await client.createScenario({ name: 'Original Name' });

      const updated = await client.updateScenario(created.id, {
        name: 'Updated Name',
        difficulty: 'hard',
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.difficulty).toBe('hard');
    });

    it('should delete a scenario', async () => {
      const created = await client.createScenario({ name: 'To Delete' });

      const result = await client.deleteScenario(created.id);

      expect(result.deleted).toBe(true);
    });
  });

  describe('Webhook Management Integration', () => {
    it('should register a webhook', async () => {
      const webhook = await client.registerWebhook({
        app_id: APP_ID,
        url: 'https://example.com/webhook',
        events: ['verify.success', 'verify.fail'],
      });

      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.events).toContain('verify.success');
      expect(webhook.enabled).toBe(true);
    });

    it('should list webhooks', async () => {
      await client.registerWebhook({
        app_id: APP_ID,
        url: 'https://example.com/hook1',
        events: ['verify.success'],
      });
      await client.registerWebhook({
        app_id: APP_ID,
        url: 'https://example.com/hook2',
        events: ['verify.fail'],
      });

      const result = await client.listWebhooks();

      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.webhooks.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter webhooks by appId', async () => {
      await client.registerWebhook({
        app_id: 'other-app',
        url: 'https://example.com/other',
        events: [],
      });

      const result = await client.listWebhooks({ appId: APP_ID });

      result.webhooks.forEach((webhook) => {
        expect(webhook.app_id).toBe(APP_ID);
      });
    });

    it('should update a webhook', async () => {
      const webhook = await client.registerWebhook({
        app_id: APP_ID,
        url: 'https://example.com/original',
        events: ['verify.success'],
      });

      const updated = await client.updateWebhook(webhook.id!, {
        url: 'https://example.com/updated',
        enabled: false,
      });

      expect(updated.url).toBe('https://example.com/updated');
      expect(updated.enabled).toBe(false);
    });

    it('should unregister a webhook', async () => {
      const webhook = await client.registerWebhook({
        app_id: APP_ID,
        url: 'https://example.com/to-delete',
        events: [],
      });

      const result = await client.unregisterWebhook(webhook.id!);

      expect(result.deleted).toBe(true);
    });
  });

  describe('API Version Integration', () => {
    it('should use v1 API by default', async () => {
      client.setApiVersion('v1');
      const health = await client.healthCheck();
      expect(health.service).toBe('captchax-test');
    });

    it('should switch to v2 API', async () => {
      client.setApiVersion('v2');
      const result = await client.listScenarios();
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing appId', async () => {
      const clientWithoutAppId = new CaptchaXClient({
        baseUrl: BASE_URL,
      });

      await expect(clientWithoutAppId.generateSliderCaptcha()).rejects.toThrow(
        'appId is required'
      );
    });

    it('should handle invalid captcha ID', async () => {
      await expect(
        client.verifySliderCaptcha('invalid-id', 100, 100)
      ).rejects.toThrow();
    });

    it('should handle missing scenario ID', async () => {
      await expect(client.getScenario('non-existent')).rejects.toThrow();
    });

    it('should handle missing webhook ID', async () => {
      await expect(client.unregisterWebhook('non-existent')).rejects.toThrow();
    });
  });

  describe('Client Info Integration', () => {
    it('should create client info with timestamp', async () => {
      const info = client.createClientInfo();
      const parsed = JSON.parse(info);

      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('should include custom fields in client info', async () => {
      const info = client.createClientInfo({
        customField: 'test-value',
        ip: '192.168.1.100',
      });
      const parsed = JSON.parse(info);

      expect(parsed.customField).toBe('test-value');
      expect(parsed.ip).toBe('192.168.1.100');
    });
  });

  describe('Generate and Verify Integration', () => {
    it('should generate and verify slider in one call', async () => {
      const result = await client.generateAndVerifySlider();

      expect(result.captcha.id).toBeDefined();
      expect(result.verifyResult.success).toBe(true);
    });

    it('should generate and verify click in one call', async () => {
      const result = await client.generateAndVerifyClick();

      expect(result.captcha.id).toBeDefined();
      expect(result.verifyResult.success).toBe(true);
    });
  });
});

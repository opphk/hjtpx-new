import { CaptchaXClient, CaptchaXError } from '../../src';
import {
  SliderCaptchaResult,
  SliderVerifyResult,
  ClickCaptchaResult,
  ClickVerifyResult,
  PuzzleCaptchaResult,
  PuzzleVerifyResult,
  Scenario,
  Webhook,
  HealthStatus,
} from '../../src/types';

const BASE_URL = 'http://localhost:3000';
const APP_ID = 'test-app-id';

describe('CaptchaXClient - Unit Tests', () => {
  let client: CaptchaXClient;

  beforeEach(() => {
    client = new CaptchaXClient({
      baseUrl: BASE_URL,
      appId: APP_ID,
      timeout: 5000,
      retryTimes: 2,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeInstanceOf(CaptchaXClient);
    });

    it('should throw error when baseUrl is missing', () => {
      expect(() => {
        new CaptchaXClient({ baseUrl: '' });
      }).toThrow('baseUrl is required');
    });

    it('should throw error when baseUrl is undefined', () => {
      expect(() => {
        new CaptchaXClient({} as any);
      }).toThrow('baseUrl is required');
    });

    it('should use v1 by default', () => {
      expect(client.getApiVersion()).toBe('v1');
    });

    it('should accept custom apiVersion v2', () => {
      const clientV2 = new CaptchaXClient({
        baseUrl: BASE_URL,
        apiVersion: 'v2',
      });
      expect(clientV2.getApiVersion()).toBe('v2');
    });

    it('should set appId header when provided', () => {
      const newClient = new CaptchaXClient({
        baseUrl: BASE_URL,
        appId: 'custom-app',
      });
      expect(newClient).toBeInstanceOf(CaptchaXClient);
    });
  });

  describe('setAppId', () => {
    it('should update appId', () => {
      client.setAppId('new-app-id');
      client.setAppId('another-app-id');
    });

    it('should allow setting appId to empty string', () => {
      client.setAppId('');
    });
  });

  describe('setApiVersion', () => {
    it('should update api version to v2', () => {
      client.setApiVersion('v2');
      expect(client.getApiVersion()).toBe('v2');
    });

    it('should update api version back to v1', () => {
      client.setApiVersion('v2');
      client.setApiVersion('v1');
      expect(client.getApiVersion()).toBe('v1');
    });
  });

  describe('getApiVersion', () => {
    it('should return current api version', () => {
      expect(client.getApiVersion()).toBe('v1');
      client.setApiVersion('v2');
      expect(client.getApiVersion()).toBe('v2');
    });
  });

  describe('healthCheck', () => {
    it('should call health endpoint', async () => {
      const mockResponse: HealthStatus = {
        status: 'healthy',
        service: 'captchax',
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
      };

      const getMock = jest.fn().mockResolvedValue(mockResponse);
      (client as any).http.get = getMock;

      const result = await client.healthCheck();
      expect(result).toEqual(mockResponse);
      expect(getMock).toHaveBeenCalledWith('/health');
    });
  });

  describe('generateSliderCaptcha', () => {
    it('should throw error when appId is missing', async () => {
      const clientWithoutAppId = new CaptchaXClient({
        baseUrl: BASE_URL,
      });

      await expect(clientWithoutAppId.generateSliderCaptcha()).rejects.toThrow(
        'appId is required for captcha generation'
      );
    });

    it('should call slider captcha endpoint with default options', async () => {
      const mockResult: SliderCaptchaResult = {
        id: 'captcha-123',
        background_b64: 'base64string',
        slider_b64: 'sliderbase64',
        target_x: 150,
        target_y: 100,
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      const result = await client.generateSliderCaptcha();

      expect(result).toEqual(mockResult);
      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/slider',
        expect.objectContaining({
          app_id: APP_ID,
        })
      );
    });

    it('should include custom options in request', async () => {
      const mockResult: SliderCaptchaResult = {
        id: 'captcha-123',
        background_b64: 'base64string',
        slider_b64: 'sliderbase64',
        target_x: 200,
        target_y: 150,
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      await client.generateSliderCaptcha({
        width: 400,
        height: 300,
        clientInfo: 'test-client',
        scenarioId: 'scenario-1',
      });

      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/slider',
        expect.objectContaining({
          app_id: APP_ID,
          width: 400,
          height: 300,
          client_info: 'test-client',
          scenario_id: 'scenario-1',
        })
      );
    });
  });

  describe('verifySliderCaptcha', () => {
    it('should verify slider captcha', async () => {
      const mockResult: SliderVerifyResult = {
        success: true,
        message: 'Verification successful',
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      const result = await client.verifySliderCaptcha('captcha-123', 150, 100);

      expect(result).toEqual(mockResult);
      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/slider/verify',
        {
          captcha_id: 'captcha-123',
          target_x: 150,
          target_y: 100,
        }
      );
    });

    it('should work without target_y', async () => {
      const mockResult: SliderVerifyResult = {
        success: true,
        message: 'Verification successful',
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      const result = await client.verifySliderCaptcha('captcha-123', 150);

      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/slider/verify',
        expect.objectContaining({
          target_y: undefined,
        })
      );
    });
  });

  describe('generateClickCaptcha', () => {
    it('should throw error when appId is missing', async () => {
      const clientWithoutAppId = new CaptchaXClient({
        baseUrl: BASE_URL,
      });

      await expect(clientWithoutAppId.generateClickCaptcha()).rejects.toThrow(
        'appId is required for captcha generation'
      );
    });

    it('should call click captcha endpoint', async () => {
      const mockResult: ClickCaptchaResult = {
        id: 'click-captcha-123',
        image: 'base64image',
        target_chars: ['A', 'B', 'C'],
        char_positions: [
          { char: 'A', x: 100, y: 50 },
          { char: 'B', x: 200, y: 100 },
          { char: 'C', x: 300, y: 150 },
        ],
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      const result = await client.generateClickCaptcha({
        charCount: 3,
        clientInfo: 'test',
      });

      expect(result).toEqual(mockResult);
      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/click',
        expect.objectContaining({
          app_id: APP_ID,
          char_count: 3,
          client_info: 'test',
        })
      );
    });
  });

  describe('verifyClickCaptcha', () => {
    it('should verify click captcha', async () => {
      const mockResult: ClickVerifyResult = {
        success: true,
        score: 0.95,
        message: 'Verification successful',
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      const clicks = [
        { char: 'A', x: 100, y: 50 },
        { char: 'B', x: 200, y: 100 },
      ];

      const result = await client.verifyClickCaptcha('click-captcha-123', clicks);

      expect(result).toEqual(mockResult);
      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/click/verify',
        {
          captcha_id: 'click-captcha-123',
          clicks,
        }
      );
    });
  });

  describe('generatePuzzleCaptcha', () => {
    it('should throw error when appId is missing', async () => {
      const clientWithoutAppId = new CaptchaXClient({
        baseUrl: BASE_URL,
      });

      await expect(clientWithoutAppId.generatePuzzleCaptcha()).rejects.toThrow(
        'appId is required for captcha generation'
      );
    });

    it('should call puzzle captcha endpoint', async () => {
      const mockResult: PuzzleCaptchaResult = {
        id: 'puzzle-captcha-123',
        background_b64: 'base64background',
        puzzle_b64: 'base64puzzle',
        target_x: 180,
        target_y: 120,
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      const result = await client.generatePuzzleCaptcha({
        width: 320,
        height: 240,
      });

      expect(result).toEqual(mockResult);
      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/puzzle',
        expect.objectContaining({
          app_id: APP_ID,
          width: 320,
          height: 240,
        })
      );
    });
  });

  describe('verifyPuzzleCaptcha', () => {
    it('should verify puzzle captcha', async () => {
      const mockResult: PuzzleVerifyResult = {
        success: true,
        message: 'Verification successful',
      };

      const postMock = jest.fn().mockResolvedValue(mockResult);
      (client as any).http.post = postMock;

      const result = await client.verifyPuzzleCaptcha('puzzle-123', 180, 120);

      expect(result).toEqual(mockResult);
      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/puzzle/verify',
        {
          captcha_id: 'puzzle-123',
          target_x: 180,
          target_y: 120,
        }
      );
    });
  });

  describe('batchVerify', () => {
    it('should call batch verify endpoint', async () => {
      const mockResponse = {
        results: [
          { captcha_id: '1', success: true, message: 'ok' },
          { captcha_id: '2', success: false, message: 'failed' },
        ],
        summary: {
          total: 2,
          success: 1,
          failed: 1,
          skipped: 0,
        },
      };

      const postMock = jest.fn().mockResolvedValue(mockResponse);
      (client as any).http.post = postMock;

      const items = [
        { captcha_id: '1', type: 'slider' as const, target_x: 100 },
        { captcha_id: '2', type: 'click' as const, target_x: 0, clicks: [] },
      ];

      const result = await client.batchVerify(items);

      expect(result).toEqual(mockResponse);
      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/batch/verify',
        { items },
        {}
      );
    });

    it('should include deduplicationId when provided', async () => {
      const mockResponse = {
        results: [],
        summary: { total: 0, success: 0, failed: 0, skipped: 0 },
      };

      const postMock = jest.fn().mockResolvedValue(mockResponse);
      (client as any).http.post = postMock;

      await client.batchVerify([], { deduplicationId: 'dedup-123' });

      expect(postMock).toHaveBeenCalledWith(
        '/api/v1/captcha/batch/verify',
        { items: [] },
        { deduplicationId: 'dedup-123' }
      );
    });
  });

  describe('scenario management', () => {
    describe('listScenarios', () => {
      it('should list all scenarios', async () => {
        const mockResponse = {
          scenarios: [
            { id: '1', name: 'Scenario 1' },
            { id: '2', name: 'Scenario 2' },
          ],
          total: 2,
        };

        const getMock = jest.fn().mockResolvedValue(mockResponse);
        (client as any).http.get = getMock;

        const result = await client.listScenarios();

        expect(result).toEqual(mockResponse);
        expect(getMock).toHaveBeenCalledWith('/api/v1/captcha/scenarios');
      });
    });

    describe('createScenario', () => {
      it('should create a new scenario', async () => {
        const mockScenario: Scenario = {
          id: 'new-scenario-id',
          name: 'New Scenario',
          description: 'A new test scenario',
          difficulty: 'medium',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const postMock = jest.fn().mockResolvedValue(mockScenario);
        (client as any).http.post = postMock;

        const result = await client.createScenario({
          name: 'New Scenario',
          description: 'A new test scenario',
          difficulty: 'medium',
        });

        expect(result).toEqual(mockScenario);
        expect(postMock).toHaveBeenCalledWith(
          '/api/v1/captcha/scenarios',
          expect.objectContaining({
            name: 'New Scenario',
          })
        );
      });
    });

    describe('getScenario', () => {
      it('should get scenario by id', async () => {
        const mockScenario: Scenario = {
          id: 'scenario-123',
          name: 'Test Scenario',
        };

        const getMock = jest.fn().mockResolvedValue(mockScenario);
        (client as any).http.get = getMock;

        const result = await client.getScenario('scenario-123');

        expect(result).toEqual(mockScenario);
        expect(getMock).toHaveBeenCalledWith('/api/v1/captcha/scenarios/scenario-123');
      });
    });

    describe('updateScenario', () => {
      it('should update scenario', async () => {
        const mockScenario: Scenario = {
          id: 'scenario-123',
          name: 'Updated Scenario',
          updated_at: '2024-01-02T00:00:00Z',
        };

        const putMock = jest.fn().mockResolvedValue(mockScenario);
        (client as any).http.put = putMock;

        const result = await client.updateScenario('scenario-123', {
          name: 'Updated Scenario',
        });

        expect(result).toEqual(mockScenario);
        expect(putMock).toHaveBeenCalledWith(
          '/api/v1/captcha/scenarios/scenario-123',
          { name: 'Updated Scenario' }
        );
      });
    });

    describe('deleteScenario', () => {
      it('should delete scenario', async () => {
        const deleteMock = jest.fn().mockResolvedValue({ deleted: true });
        (client as any).http.delete = deleteMock;

        const result = await client.deleteScenario('scenario-123');

        expect(result).toEqual({ deleted: true });
        expect(deleteMock).toHaveBeenCalledWith('/api/v1/captcha/scenarios/scenario-123');
      });
    });
  });

  describe('webhook management', () => {
    describe('registerWebhook', () => {
      it('should register a new webhook', async () => {
        const mockWebhook: Webhook = {
          id: 'webhook-123',
          app_id: APP_ID,
          url: 'https://example.com/webhook',
          events: ['verify.success', 'verify.fail'],
          enabled: true,
          created_at: '2024-01-01T00:00:00Z',
        };

        const postMock = jest.fn().mockResolvedValue(mockWebhook);
        (client as any).http.post = postMock;

        const result = await client.registerWebhook({
          app_id: APP_ID,
          url: 'https://example.com/webhook',
          events: ['verify.success', 'verify.fail'],
        });

        expect(result).toEqual(mockWebhook);
        expect(postMock).toHaveBeenCalledWith(
          '/api/v1/captcha/webhook/register',
          expect.objectContaining({
            url: 'https://example.com/webhook',
          })
        );
      });
    });

    describe('listWebhooks', () => {
      it('should list all webhooks', async () => {
        const mockResponse = {
          webhooks: [
            { id: '1', app_id: APP_ID, url: 'https://example.com/hook1', events: [] },
            { id: '2', app_id: APP_ID, url: 'https://example.com/hook2', events: [] },
          ],
          total: 2,
        };

        const getMock = jest.fn().mockResolvedValue(mockResponse);
        (client as any).http.get = getMock;

        const result = await client.listWebhooks();

        expect(result).toEqual(mockResponse);
        expect(getMock).toHaveBeenCalledWith('/api/v1/captcha/webhook');
      });

      it('should filter by appId', async () => {
        const mockResponse = {
          webhooks: [{ id: '1', app_id: 'other-app', url: 'https://example.com/hook', events: [] }],
          total: 1,
        };

        const getMock = jest.fn().mockResolvedValue(mockResponse);
        (client as any).http.get = getMock;

        await client.listWebhooks({ appId: 'other-app' });

        expect(getMock).toHaveBeenCalledWith(
          '/api/v1/captcha/webhook?app_id=other-app'
        );
      });
    });

    describe('updateWebhook', () => {
      it('should update webhook', async () => {
        const mockWebhook: Webhook = {
          id: 'webhook-123',
          app_id: APP_ID,
          url: 'https://example.com/new-webhook',
          events: ['verify.success'],
          enabled: false,
        };

        const putMock = jest.fn().mockResolvedValue(mockWebhook);
        (client as any).http.put = putMock;

        const result = await client.updateWebhook('webhook-123', {
          url: 'https://example.com/new-webhook',
          enabled: false,
        });

        expect(result).toEqual(mockWebhook);
        expect(putMock).toHaveBeenCalledWith(
          '/api/v1/captcha/webhook/webhook-123',
          expect.objectContaining({
            url: 'https://example.com/new-webhook',
          })
        );
      });
    });

    describe('unregisterWebhook', () => {
      it('should unregister webhook', async () => {
        const deleteMock = jest.fn().mockResolvedValue({ deleted: true });
        (client as any).http.delete = deleteMock;

        const result = await client.unregisterWebhook('webhook-123');

        expect(result).toEqual({ deleted: true });
        expect(deleteMock).toHaveBeenCalledWith('/api/v1/captcha/webhook/webhook-123');
      });
    });
  });

  describe('createClientInfo', () => {
    it('should create client info with default values', () => {
      const info = client.createClientInfo();
      const parsed = JSON.parse(info);
      expect(parsed).toHaveProperty('timestamp');
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('should include custom fields', () => {
      const info = client.createClientInfo({ customField: 'value', ip: '192.168.1.1' });
      const parsed = JSON.parse(info);
      expect(parsed.customField).toBe('value');
      expect(parsed.ip).toBe('192.168.1.1');
    });

    it('should override default values', () => {
      const customTimestamp = 1234567890000;
      const info = client.createClientInfo({ timestamp: customTimestamp });
      const parsed = JSON.parse(info);
      expect(parsed.timestamp).toBe(customTimestamp);
    });

    it('should handle undefined navigator gracefully', () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      const info = client.createClientInfo();
      const parsed = JSON.parse(info);

      expect(parsed).toHaveProperty('timestamp');

      global.navigator = originalNavigator;
    });
  });

  describe('generateAndVerifySlider', () => {
    it('should generate and verify slider captcha', async () => {
      const mockCaptcha: SliderCaptchaResult = {
        id: 'captcha-123',
        background_b64: 'bg',
        slider_b64: 'slider',
        target_x: 150,
        target_y: 100,
      };

      const mockVerifyResult: SliderVerifyResult = {
        success: true,
        message: 'Verified',
      };

      const postMock = jest.fn()
        .mockResolvedValueOnce(mockCaptcha)
        .mockResolvedValueOnce(mockVerifyResult);
      (client as any).http.post = postMock;

      const result = await client.generateAndVerifySlider();

      expect(result.captcha).toEqual(mockCaptcha);
      expect(result.verifyResult).toEqual(mockVerifyResult);
    });

    it('should call verifyCallback if provided', async () => {
      const mockCaptcha: SliderCaptchaResult = {
        id: 'captcha-123',
        background_b64: 'bg',
        slider_b64: 'slider',
        target_x: 150,
        target_y: 100,
      };

      const mockVerifyResult: SliderVerifyResult = {
        success: true,
        message: 'Verified',
      };

      const postMock = jest.fn()
        .mockResolvedValueOnce(mockCaptcha)
        .mockResolvedValueOnce(mockVerifyResult);
      (client as any).http.post = postMock;

      const callback = jest.fn().mockReturnValue(true);

      await client.generateAndVerifySlider({}, callback);

      expect(callback).toHaveBeenCalledWith(mockVerifyResult);
    });

    it('should throw error when verifyCallback returns false', async () => {
      const mockCaptcha: SliderCaptchaResult = {
        id: 'captcha-123',
        background_b64: 'bg',
        slider_b64: 'slider',
        target_x: 150,
        target_y: 100,
      };

      const mockVerifyResult: SliderVerifyResult = {
        success: false,
        message: 'Failed',
      };

      const postMock = jest.fn()
        .mockResolvedValueOnce(mockCaptcha)
        .mockResolvedValueOnce(mockVerifyResult);
      (client as any).http.post = postMock;

      const callback = jest.fn().mockReturnValue(false);

      await expect(
        client.generateAndVerifySlider({}, callback)
      ).rejects.toThrow('Slider verification failed validation');
    });
  });

  describe('generateAndVerifyClick', () => {
    it('should generate and verify click captcha', async () => {
      const mockCaptcha: ClickCaptchaResult = {
        id: 'click-123',
        image: 'base64',
        target_chars: ['A', 'B'],
        char_positions: [
          { char: 'A', x: 100, y: 50 },
          { char: 'B', x: 200, y: 100 },
        ],
      };

      const mockVerifyResult: ClickVerifyResult = {
        success: true,
        score: 1.0,
        message: 'Verified',
      };

      const postMock = jest.fn()
        .mockResolvedValueOnce(mockCaptcha)
        .mockResolvedValueOnce(mockVerifyResult);
      (client as any).http.post = postMock;

      const result = await client.generateAndVerifyClick();

      expect(result.captcha).toEqual(mockCaptcha);
      expect(result.verifyResult).toEqual(mockVerifyResult);
    });
  });
});

describe('CaptchaXError', () => {
  it('should create error with default values', () => {
    const error = new CaptchaXError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(500);
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('CaptchaXError');
  });

  it('should create error with custom values', () => {
    const error = new CaptchaXError('Test error', 400, 400, { details: 'test' });
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(400);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ details: 'test' });
  });

  it('should be instance of Error', () => {
    const error = new CaptchaXError('Test error');
    expect(error instanceof Error).toBe(true);
  });

  it('should serialize correctly', () => {
    const error = new CaptchaXError('Test error', 500, 500, { key: 'value' });
    expect(error.toString()).toContain('CaptchaXError');
    expect(error.toString()).toContain('Test error');
  });
});

import { CaptchaXClient, CaptchaXError } from '../../src';
import {
  SliderCaptchaResult,
  SliderVerifyResult,
  ClickCaptchaResult,
  ClickVerifyResult,
  PuzzleCaptchaResult,
  PuzzleVerifyResult,
  BatchVerifyResponse,
} from '../../src/types';

const BASE_URL = 'http://localhost:3000';
const APP_ID = 'test-app-id';

describe('CaptchaXClient - Mock Tests', () => {
  let client: CaptchaXClient;

  beforeEach(() => {
    client = new CaptchaXClient({
      baseUrl: BASE_URL,
      appId: APP_ID,
      timeout: 5000,
      retryTimes: 1,
    });

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockSuccessResponse = <T>(data: T) => ({
    code: 200,
    message: 'success',
    data,
  });

  const mockErrorResponse = (message: string, code: number = 400) => ({
    code,
    message,
    data: null,
  });

  describe('Slider Captcha Flow', () => {
    it('should complete full slider captcha flow', async () => {
      const sliderResult: SliderCaptchaResult = {
        id: 'slider-mock-123',
        background_b64: 'mock-background-base64',
        slider_b64: 'mock-slider-base64',
        target_x: 200,
        target_y: 150,
      };

      const verifyResult: SliderVerifyResult = {
        success: true,
        message: 'Verification successful',
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(sliderResult)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(verifyResult)),
        });

      const captcha = await client.generateSliderCaptcha();
      expect(captcha.id).toBe('slider-mock-123');
      expect(captcha.target_x).toBe(200);

      const result = await client.verifySliderCaptcha(captcha.id, captcha.target_x, captcha.target_y);
      expect(result.success).toBe(true);
    });

    it('should handle slider verification failure', async () => {
      const sliderResult: SliderCaptchaResult = {
        id: 'slider-mock-123',
        background_b64: 'mock-bg',
        slider_b64: 'mock-slider',
        target_x: 100,
        target_y: 100,
      };

      const verifyResult: SliderVerifyResult = {
        success: false,
        message: 'Verification failed - incorrect position',
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(sliderResult)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(verifyResult)),
        });

      await client.generateSliderCaptcha();
      const result = await client.verifySliderCaptcha(sliderResult.id, 50, 50);
      expect(result.success).toBe(false);
    });
  });

  describe('Click Captcha Flow', () => {
    it('should complete full click captcha flow', async () => {
      const clickResult: ClickCaptchaResult = {
        id: 'click-mock-123',
        image: 'mock-image-base64',
        target_chars: ['A', 'B', 'C'],
        char_positions: [
          { char: 'A', x: 100, y: 50 },
          { char: 'B', x: 200, y: 100 },
          { char: 'C', x: 300, y: 150 },
        ],
      };

      const verifyResult: ClickVerifyResult = {
        success: true,
        score: 0.98,
        message: 'Verification successful',
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(clickResult)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(verifyResult)),
        });

      const captcha = await client.generateClickCaptcha({ charCount: 3 });
      expect(captcha.target_chars).toEqual(['A', 'B', 'C']);

      const clicks = captcha.char_positions.map((pos) => ({
        char: pos.char,
        x: pos.x,
        y: pos.y,
      }));

      const result = await client.verifyClickCaptcha(captcha.id, clicks);
      expect(result.success).toBe(true);
      expect(result.score).toBe(0.98);
    });
  });

  describe('Puzzle Captcha Flow', () => {
    it('should complete full puzzle captcha flow', async () => {
      const puzzleResult: PuzzleCaptchaResult = {
        id: 'puzzle-mock-123',
        background_b64: 'mock-bg-base64',
        puzzle_b64: 'mock-puzzle-base64',
        target_x: 180,
        target_y: 120,
      };

      const verifyResult: PuzzleVerifyResult = {
        success: true,
        message: 'Puzzle verified',
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(puzzleResult)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(verifyResult)),
        });

      const captcha = await client.generatePuzzleCaptcha({ width: 320, height: 240 });
      expect(captcha.target_x).toBe(180);

      const result = await client.verifyPuzzleCaptcha(captcha.id, captcha.target_x, captcha.target_y);
      expect(result.success).toBe(true);
    });
  });

  describe('Batch Verification', () => {
    it('should verify multiple captchas in batch', async () => {
      const batchResponse: BatchVerifyResponse = {
        results: [
          { captcha_id: '1', success: true, message: 'ok', score: 1.0 },
          { captcha_id: '2', success: true, message: 'ok', score: 0.95 },
          { captcha_id: '3', success: false, message: 'failed' },
        ],
        summary: {
          total: 3,
          success: 2,
          failed: 1,
          skipped: 0,
        },
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse(batchResponse)),
      });

      const result = await client.batchVerify([
        { captcha_id: '1', type: 'slider', target_x: 100 },
        { captcha_id: '2', type: 'click', target_x: 0, clicks: [] },
        { captcha_id: '3', type: 'puzzle', target_x: 150, target_y: 100 },
      ]);

      expect(result.summary.total).toBe(3);
      expect(result.summary.success).toBe(2);
      expect(result.summary.failed).toBe(1);
    });

    it('should handle empty batch', async () => {
      const batchResponse: BatchVerifyResponse = {
        results: [],
        summary: {
          total: 0,
          success: 0,
          failed: 0,
          skipped: 0,
        },
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse(batchResponse)),
      });

      const result = await client.batchVerify([]);
      expect(result.summary.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors with retry', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({ status: 'ok' })),
        });

      const result = await client.healthCheck();
      expect(result.status).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      await expect(client.healthCheck()).rejects.toThrow(CaptchaXError);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle HTTP 500 errors with retry', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue(mockErrorResponse('Server error', 500)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({ status: 'ok' })),
        });

      const result = await client.healthCheck();
      expect(result.status).toBe('ok');
    });

    it('should not retry on client errors (4xx)', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue(mockErrorResponse('Bad request', 400)),
      });

      await expect(client.generateSliderCaptcha()).rejects.toThrow(CaptchaXError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValue(abortError);

      await expect(client.healthCheck()).rejects.toThrow('Request timeout');
    });
  });

  describe('API Version', () => {
    it('should use v1 by default', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse({ status: 'ok' })),
      });

      await client.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/'),
        expect.any(Object)
      );
    });

    it('should switch to v2 when configured', async () => {
      client.setApiVersion('v2');

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse({ scenarios: [], total: 0 })),
      });

      await client.listScenarios();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/'),
        expect.any(Object)
      );
    });
  });

  describe('Custom Headers', () => {
    it('should include app ID in requests', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse({ id: '123' })),
      });

      await client.generateSliderCaptcha();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-App-ID': APP_ID,
          }),
        })
      );
    });

    it('should update app ID dynamically', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse({ id: '123' })),
      });

      await client.generateSliderCaptcha();
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-App-ID': APP_ID,
          }),
        })
      );

      client.setAppId('new-app-id');
      await client.generateSliderCaptcha();

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-App-ID': 'new-app-id',
          }),
        })
      );
    });
  });

  describe('Scenario Operations', () => {
    it('should create, get, update, and delete scenarios', async () => {
      const newScenario = {
        id: 'new-scenario-id',
        name: 'Test Scenario',
        description: 'Test description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const updatedScenario = {
        ...newScenario,
        name: 'Updated Scenario',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(newScenario)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(updatedScenario)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({ deleted: true })),
        });

      const created = await client.createScenario({
        name: 'Test Scenario',
        description: 'Test description',
      });
      expect(created.id).toBe('new-scenario-id');

      const updated = await client.updateScenario('new-scenario-id', {
        name: 'Updated Scenario',
      });
      expect(updated.name).toBe('Updated Scenario');

      const deleted = await client.deleteScenario('new-scenario-id');
      expect(deleted.deleted).toBe(true);
    });
  });

  describe('Webhook Operations', () => {
    it('should register, list, update, and unregister webhooks', async () => {
      const webhook = {
        id: 'webhook-123',
        app_id: APP_ID,
        url: 'https://example.com/webhook',
        events: ['verify.success'],
        enabled: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse(webhook)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({
            webhooks: [webhook],
            total: 1,
          })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({ ...webhook, enabled: false })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({ deleted: true })),
        });

      const registered = await client.registerWebhook({
        app_id: APP_ID,
        url: 'https://example.com/webhook',
        events: ['verify.success'],
      });
      expect(registered.id).toBe('webhook-123');

      const listed = await client.listWebhooks();
      expect(listed.total).toBe(1);

      const updated = await client.updateWebhook('webhook-123', { enabled: false });
      expect(updated.enabled).toBe(false);

      const unregistered = await client.unregisterWebhook('webhook-123');
      expect(unregistered.deleted).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse({ status: 'ok' })),
      });

      const results = await Promise.all([
        client.healthCheck(),
        client.healthCheck(),
        client.healthCheck(),
      ]);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure in concurrent requests', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({ status: 'ok' })),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue(mockErrorResponse('Bad request', 400)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockSuccessResponse({ status: 'ok' })),
        });

      const results = await Promise.allSettled([
        client.healthCheck(),
        client.healthCheck(),
        client.healthCheck(),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Request Deduplication', () => {
    it('should add deduplication header for batch operations', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse({
          results: [],
          summary: { total: 0, success: 0, failed: 0, skipped: 0 },
        })),
      });

      const deduplicationId = 'unique-batch-id-' + Date.now();
      await client.batchVerify([], { deduplicationId });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Deduplication-ID': deduplicationId,
          }),
        })
      );
    });
  });
});

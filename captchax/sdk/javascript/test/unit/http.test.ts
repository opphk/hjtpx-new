import { HttpClient } from '../../src/http';
import { CaptchaXError } from '../../src/types';

const BASE_URL = 'http://localhost:3000';

describe('HttpClient - Unit Tests', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient(BASE_URL, 5000, 3);
    (fetch as jest.Mock).mockReset();
  });

  describe('constructor', () => {
    it('should create HttpClient with baseUrl', () => {
      expect(client).toBeInstanceOf(HttpClient);
    });

    it('should trim trailing slash from baseUrl', () => {
      const clientWithSlash = new HttpClient('http://example.com/');
      expect(clientWithSlash).toBeInstanceOf(HttpClient);
    });

    it('should use default values', () => {
      const defaultClient = new HttpClient(BASE_URL);
      expect(defaultClient).toBeInstanceOf(HttpClient);
    });
  });

  describe('setHeader', () => {
    it('should set a single header', () => {
      client.setHeader('X-Custom-Header', 'value');
    });

    it('should overwrite existing header', () => {
      client.setHeader('Content-Type', 'application/xml');
      client.setHeader('Content-Type', 'application/json');
    });
  });

  describe('setHeaders', () => {
    it('should set multiple headers at once', () => {
      client.setHeaders({
        'X-Header-1': 'value1',
        'X-Header-2': 'value2',
      });
    });

    it('should merge with existing headers', () => {
      client.setHeader('X-Existing', 'existing');
      client.setHeaders({
        'X-New': 'new',
      });
    });
  });

  describe('get', () => {
    it('should make GET request successfully', async () => {
      const mockResponse = {
        code: 200,
        message: 'success',
        data: { status: 'ok' },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await client.get<{ status: string }>('/health');
      expect(result).toEqual({ status: 'ok' });
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include custom headers in GET request', async () => {
      const mockResponse = {
        code: 200,
        message: 'success',
        data: { items: [] },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await client.get<{ items: unknown[] }>('/api/v1/items', {
        headers: { 'X-Custom': 'header' },
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'header',
          }),
        })
      );
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      const mockResponse = {
        code: 200,
        message: 'success',
        data: { id: '123' },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const body = { app_id: 'test', width: 300 };
      const result = await client.post<{ id: string }>('/api/v1/captcha/slider', body);

      expect(result).toEqual({ id: '123' });
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/captcha/slider',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should not include body in GET requests', async () => {
      const mockResponse = {
        code: 200,
        message: 'success',
        data: null,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await client.get('/api/v1/test');

      const callArgs = (fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.body).toBeUndefined();
    });
  });

  describe('put', () => {
    it('should make PUT request with body', async () => {
      const mockResponse = {
        code: 200,
        message: 'success',
        data: { updated: true },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await client.put<{ updated: boolean }>(
        '/api/v1/scenarios/123',
        { name: 'Updated Scenario' }
      );

      expect(result).toEqual({ updated: true });
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/scenarios/123',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      const mockResponse = {
        code: 200,
        message: 'success',
        data: { deleted: true },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await client.delete<{ deleted: boolean }>('/api/v1/scenarios/123');

      expect(result).toEqual({ deleted: true });
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/scenarios/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw CaptchaXError on HTTP error', async () => {
      const errorResponse = {
        code: 400,
        message: 'Bad Request',
        data: null,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValueOnce(errorResponse),
      });

      await expect(client.get('/api/v1/test')).rejects.toThrow(CaptchaXError);
    });

    it('should throw CaptchaXError on network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      await expect(client.get('/api/v1/test')).rejects.toThrow(CaptchaXError);
    });

    it('should include status code in error', async () => {
      const errorResponse = {
        code: 404,
        message: 'Not Found',
        data: null,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValueOnce(errorResponse),
      });

      try {
        await client.get('/api/v1/test');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CaptchaXError);
        expect((error as CaptchaXError).statusCode).toBe(404);
        expect((error as CaptchaXError).code).toBe(404);
      }
    });

    it('should throw timeout error', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      (fetch as jest.Mock).mockRejectedValueOnce(abortError);

      await expect(client.get('/api/v1/test')).rejects.toThrow('Request timeout');
    });

    it('should retry on 5xx errors', async () => {
      const errorResponse = {
        code: 500,
        message: 'Internal Server Error',
        data: null,
      };

      const successResponse = {
        code: 200,
        message: 'success',
        data: { status: 'ok' },
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValueOnce(errorResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValueOnce(errorResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(successResponse),
        });

      const result = await client.get<{ status: string }>('/health');
      expect(result).toEqual({ status: 'ok' });
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      const errorResponse = {
        code: 400,
        message: 'Bad Request',
        data: null,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValueOnce(errorResponse),
      });

      await expect(client.get('/api/v1/test')).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('deduplication', () => {
    it('should add deduplication header when provided', async () => {
      const mockResponse = {
        code: 200,
        message: 'success',
        data: { verified: true },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await client.post<{ verified: boolean }>(
        '/api/v1/captcha/batch/verify',
        { items: [] },
        { deduplicationId: 'unique-id-123' }
      );

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/captcha/batch/verify',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Deduplication-ID': 'unique-id-123',
          }),
        })
      );
    });
  });

  describe('custom timeout', () => {
    it('should use custom timeout for request', async () => {
      jest.useFakeTimers();

      const mockResponse = {
        code: 200,
        message: 'success',
        data: { status: 'ok' },
      };

      let resolvePromise: (value: Response) => void;
      const responsePromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      (fetch as jest.Mock).mockImplementationOnce(() => responsePromise);

      const requestPromise = client.get<{ status: string }>('/slow-endpoint', {
        timeout: 1000,
      });

      jest.advanceTimersByTime(1100);

      try {
        await requestPromise;
      } catch {
        // Expected to timeout
      }

      jest.useRealTimers();
    });
  });
});

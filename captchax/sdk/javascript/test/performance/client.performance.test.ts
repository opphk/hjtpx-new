import { CaptchaXClient } from '../../src';
import { startTestServer, clearAllMocks } from '../integration/test-server';

const TEST_SERVER_PORT = 3002;
const BASE_URL = `http://localhost:${TEST_SERVER_PORT}`;
const APP_ID = 'performance-test-app';

interface PerformanceMetrics {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  total: number;
  throughput: number;
}

describe('CaptchaXClient - Performance Tests', () => {
  let client: CaptchaXClient;

  beforeAll(async () => {
    await startTestServer(TEST_SERVER_PORT);
  });

  beforeEach(() => {
    client = new CaptchaXClient({
      baseUrl: BASE_URL,
      appId: APP_ID,
      timeout: 10000,
      retryTimes: 0,
    });
    clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const calculateMetrics = (times: number[]): PerformanceMetrics => {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = sum / sorted.length;

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      total: sum,
      throughput: (sorted.length / sum) * 1000,
    };
  };

  describe('Single Request Performance', () => {
    it('should measure slider captcha generation performance', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.generateSliderCaptcha();
        const end = performance.now();
        times.push(end - start);
      }

      const metrics = calculateMetrics(times);

      console.log('\n=== Slider Captcha Generation Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Min: ${metrics.min.toFixed(2)}ms`);
      console.log(`Max: ${metrics.max.toFixed(2)}ms`);
      console.log(`Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`P50: ${metrics.p50.toFixed(2)}ms`);
      console.log(`P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`P99: ${metrics.p99.toFixed(2)}ms`);
      console.log(`Throughput: ${metrics.throughput.toFixed(2)} req/s`);

      expect(metrics.avg).toBeLessThan(100);
      expect(metrics.p95).toBeLessThan(200);
    });

    it('should measure slider verification performance', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const captcha = await client.generateSliderCaptcha();
        const start = performance.now();
        await client.verifySliderCaptcha(captcha.id, captcha.target_x, captcha.target_y);
        const end = performance.now();
        times.push(end - start);
      }

      const metrics = calculateMetrics(times);

      console.log('\n=== Slider Verification Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`P95: ${metrics.p95.toFixed(2)}ms`);

      expect(metrics.avg).toBeLessThan(50);
    });

    it('should measure click captcha generation performance', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.generateClickCaptcha();
        const end = performance.now();
        times.push(end - start);
      }

      const metrics = calculateMetrics(times);

      console.log('\n=== Click Captcha Generation Performance ===');
      console.log(`Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`P95: ${metrics.p95.toFixed(2)}ms`);

      expect(metrics.avg).toBeLessThan(100);
    });

    it('should measure puzzle captcha generation performance', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.generatePuzzleCaptcha();
        const end = performance.now();
        times.push(end - start);
      }

      const metrics = calculateMetrics(times);

      console.log('\n=== Puzzle Captcha Generation Performance ===');
      console.log(`Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`P95: ${metrics.p95.toFixed(2)}ms`);

      expect(metrics.avg).toBeLessThan(100);
    });

    it('should measure health check performance', async () => {
      const iterations = 200;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.healthCheck();
        const end = performance.now();
        times.push(end - start);
      }

      const metrics = calculateMetrics(times);

      console.log('\n=== Health Check Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`Throughput: ${metrics.throughput.toFixed(2)} req/s`);

      expect(metrics.avg).toBeLessThan(30);
      expect(metrics.p95).toBeLessThan(50);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 10 concurrent requests', async () => {
      const concurrentCount = 10;
      const start = performance.now();

      const promises = Array.from({ length: concurrentCount }, () =>
        client.generateSliderCaptcha()
      );

      await Promise.all(promises);
      const end = performance.now();
      const totalTime = end - start;

      console.log(`\n=== 10 Concurrent Requests ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Avg per request: ${(totalTime / concurrentCount).toFixed(2)}ms`);
      console.log(`Throughput: ${(concurrentCount / totalTime) * 1000} req/s`);

      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle 50 concurrent requests', async () => {
      const concurrentCount = 50;
      const start = performance.now();

      const promises = Array.from({ length: concurrentCount }, () =>
        client.healthCheck()
      );

      await Promise.all(promises);
      const end = performance.now();
      const totalTime = end - start;

      console.log(`\n=== 50 Concurrent Health Checks ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(concurrentCount / totalTime) * 1000} req/s`);

      expect(totalTime).toBeLessThan(10000);
    });

    it('should handle 100 concurrent requests', async () => {
      const concurrentCount = 100;
      const start = performance.now();

      const promises = Array.from({ length: concurrentCount }, () =>
        client.healthCheck()
      );

      await Promise.all(promises);
      const end = performance.now();
      const totalTime = end - start;

      console.log(`\n=== 100 Concurrent Health Checks ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(concurrentCount / totalTime) * 1000} req/s`);

      expect(totalTime).toBeLessThan(15000);
    });

    it('should handle burst traffic with 200 concurrent requests', async () => {
      const concurrentCount = 200;
      const start = performance.now();

      const promises = Array.from({ length: concurrentCount }, () =>
        client.healthCheck()
      );

      const results = await Promise.allSettled(promises);
      const end = performance.now();
      const totalTime = end - start;

      const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;

      console.log(`\n=== 200 Concurrent Health Checks (Burst) ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(concurrentCount / totalTime) * 1000} req/s`);
      console.log(`Success rate: ${(fulfilled / concurrentCount) * 100}%`);
      console.log(`Failed: ${rejected}`);

      expect(fulfilled).toBeGreaterThan(concurrentCount * 0.95);
      expect(totalTime).toBeLessThan(30000);
    });
  });

  describe('Batch Operation Performance', () => {
    it('should measure batch verification performance', async () => {
      const captchaCount = 10;
      const captchas = [];

      for (let i = 0; i < captchaCount; i++) {
        captchas.push(await client.generateSliderCaptcha());
      }

      const items = captchas.map((c) => ({
        captcha_id: c.id,
        type: 'slider' as const,
        target_x: c.target_x,
      }));

      const start = performance.now();
      const result = await client.batchVerify(items);
      const end = performance.now();

      const totalTime = end - start;

      console.log(`\n=== Batch Verification (${captchaCount} items) ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Avg per item: ${(totalTime / captchaCount).toFixed(2)}ms`);
      console.log(`Success: ${result.summary.success}`);

      expect(totalTime).toBeLessThan(5000);
    });

    it('should measure large batch verification performance', async () => {
      const captchaCount = 50;
      const captchas = [];

      for (let i = 0; i < captchaCount; i++) {
        captchas.push(await client.generateSliderCaptcha());
      }

      const items = captchas.map((c) => ({
        captcha_id: c.id,
        type: 'slider' as const,
        target_x: c.target_x,
      }));

      const start = performance.now();
      const result = await client.batchVerify(items);
      const end = performance.now();

      const totalTime = end - start;

      console.log(`\n=== Large Batch Verification (${captchaCount} items) ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(captchaCount / totalTime) * 1000} items/s`);

      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Scenario Operations Performance', () => {
    it('should measure scenario CRUD performance', async () => {
      const start = performance.now();

      const created = await client.createScenario({
        name: 'Performance Test Scenario',
        difficulty: 'medium',
      });

      const retrieved = await client.getScenario(created.id);
      const updated = await client.updateScenario(created.id, {
        name: 'Updated Scenario',
      });
      const deleted = await client.deleteScenario(created.id);

      const end = performance.now();
      const totalTime = end - start;

      console.log(`\n=== Scenario CRUD Performance ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Create: OK, Retrieve: OK, Update: OK, Delete: OK`);

      expect(deleted.deleted).toBe(true);
      expect(totalTime).toBeLessThan(2000);
    });

    it('should measure scenario list performance', async () => {
      for (let i = 0; i < 20; i++) {
        await client.createScenario({ name: `Scenario ${i}` });
      }

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.listScenarios();
        const end = performance.now();
        times.push(end - start);
      }

      const metrics = calculateMetrics(times);

      console.log(`\n=== Scenario List Performance ===`);
      console.log(`Iterations: ${iterations}`);
      console.log(`Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`P95: ${metrics.p95.toFixed(2)}ms`);

      expect(metrics.avg).toBeLessThan(50);
    });
  });

  describe('Webhook Operations Performance', () => {
    it('should measure webhook CRUD performance', async () => {
      const start = performance.now();

      const registered = await client.registerWebhook({
        app_id: APP_ID,
        url: 'https://example.com/performance-webhook',
        events: ['verify.success'],
      });

      const listed = await client.listWebhooks();
      const updated = await client.updateWebhook(registered.id!, {
        enabled: false,
      });
      const unregistered = await client.unregisterWebhook(registered.id!);

      const end = performance.now();
      const totalTime = end - start;

      console.log(`\n=== Webhook CRUD Performance ===`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);

      expect(unregistered.deleted).toBe(true);
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory on repeated operations', async () => {
      global.gc?.();

      const initialMemory = process.memoryUsage().heapUsed;
      const operations = 500;

      for (let i = 0; i < operations; i++) {
        await client.generateSliderCaptcha();
        await client.generateClickCaptcha();
        await client.generatePuzzleCaptcha();
        await client.healthCheck();
      }

      global.gc?.();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`\n=== Memory Usage After ${operations * 4} Operations ===`);
      console.log(`Initial: ${initialMemory.toFixed(2)} KB`);
      console.log(`Final: ${finalMemory.toFixed(2)} KB`);
      console.log(`Increase: ${memoryIncrease.toFixed(2)} MB`);

      expect(memoryIncrease).toBeLessThan(100);
    });
  });

  describe('Latency Under Load', () => {
    it('should maintain acceptable latency under moderate load', async () => {
      const baselineTimes: number[] = [];
      const underLoadTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        await client.healthCheck();
        baselineTimes.push(performance.now() - start);
      }

      const loadPromises = Array.from({ length: 50 }, () =>
        client.generateSliderCaptcha()
      );

      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        await client.healthCheck();
        underLoadTimes.push(performance.now() - start);
      }

      await Promise.all(loadPromises);

      const baselineAvg = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
      const underLoadAvg = underLoadTimes.reduce((a, b) => a + b, 0) / underLoadTimes.length;
      const latencyIncrease = ((underLoadAvg - baselineAvg) / baselineAvg) * 100;

      console.log(`\n=== Latency Under Load ===`);
      console.log(`Baseline avg: ${baselineAvg.toFixed(2)}ms`);
      console.log(`Under load avg: ${underLoadAvg.toFixed(2)}ms`);
      console.log(`Latency increase: ${latencyIncrease.toFixed(2)}%`);

      expect(latencyIncrease).toBeLessThan(200);
    });
  });

  describe('Sustained Load', () => {
    it('should handle sustained load over time', async () => {
      const duration = 3000;
      const start = Date.now();
      let requestCount = 0;
      const times: number[] = [];

      while (Date.now() - start < duration) {
        const reqStart = performance.now();
        await client.healthCheck();
        times.push(performance.now() - reqStart);
        requestCount++;
      }

      const metrics = calculateMetrics(times);

      console.log(`\n=== Sustained Load (${duration}ms) ===`);
      console.log(`Total requests: ${requestCount}`);
      console.log(`Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`Throughput: ${metrics.throughput.toFixed(2)} req/s`);

      expect(requestCount).toBeGreaterThan(100);
      expect(metrics.avg).toBeLessThan(50);
    });
  });
});

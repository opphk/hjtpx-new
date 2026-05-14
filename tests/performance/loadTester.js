const http = require('http');
const https = require('https');

class LoadTester {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 60000;
    this.requestsPerSecond = options.requestsPerSecond || 100;
    this.method = options.method || 'GET';
    this.path = options.path || '/';
    this.headers = options.headers || {};
    this.body = options.body || null;
    this.results = {
      total: 0,
      success: 0,
      errors: 0,
      timeouts: 0,
      responseTimes: [],
      statusCodes: {},
      startTime: null,
      endTime: null
    };
    this.isRunning = false;
    this.shouldStop = false;
  }

  async makeRequest() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const urlObj = new URL(this.baseUrl + this.path);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: this.method,
        headers: {
          'User-Agent': 'LoadTester/1.0',
          'Content-Type': 'application/json',
          ...this.headers
        },
        timeout: 10000
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.results.total++;
          this.results.responseTimes.push(duration);

          if (res.statusCode >= 200 && res.statusCode < 400) {
            this.results.success++;
          } else {
            this.results.errors++;
          }

          this.results.statusCodes[res.statusCode] =
            (this.results.statusCodes[res.statusCode] || 0) + 1;

          resolve({ duration, statusCode: res.statusCode });
        });
      });

      req.on('error', (error) => {
        this.results.total++;
        this.results.errors++;
        resolve({ error: error.message, duration: Date.now() - startTime });
      });

      req.on('timeout', () => {
        this.results.total++;
        this.results.timeouts++;
        req.destroy();
        resolve({ timeout: true, duration: Date.now() - startTime });
      });

      if (this.body) {
        req.write(JSON.stringify(this.body));
      }
      req.end();
    });
  }

  async runConcurrentRequests(count) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.makeRequest());
    }
    return Promise.all(promises);
  }

  async start() {
    console.log(`Starting load test...`);
    console.log(`Target: ${this.baseUrl}${this.path}`);
    console.log(`Concurrency: ${this.concurrency}`);
    console.log(`Duration: ${this.duration / 1000}s`);
    console.log(`Requests/sec target: ${this.requestsPerSecond}`);
    console.log('---');

    this.isRunning = true;
    this.shouldStop = false;
    this.results.startTime = Date.now();

    const interval = 1000 / this.requestsPerSecond;
    let requestCount = 0;
    const maxRequests = (this.duration / 1000) * this.requestsPerSecond;

    const loadPromise = new Promise((resolve) => {
      const runLoad = async () => {
        if (this.shouldStop || requestCount >= maxRequests) {
          resolve();
          return;
        }

        const batchSize = Math.min(this.concurrency, maxRequests - requestCount);
        await this.runConcurrentRequests(batchSize);
        requestCount += batchSize;

        setTimeout(runLoad, interval);
      };

      setTimeout(runLoad, interval);
    });

    const progressInterval = setInterval(() => {
      if (!this.isRunning) return;
      const elapsed = Date.now() - this.results.startTime;
      const rps = (this.results.total / (elapsed / 1000)).toFixed(2);
      console.log(`Progress: ${this.results.total} requests | ${rps} req/s | ${this.results.errors} errors`);
    }, 5000);

    await loadPromise;

    clearInterval(progressInterval);
    this.results.endTime = Date.now();
    this.isRunning = false;

    return this.generateReport();
  }

  stop() {
    this.shouldStop = true;
    this.isRunning = false;
  }

  generateReport() {
    const { responseTimes, startTime, endTime } = this.results;
    const totalDuration = (endTime - startTime) / 1000;
    const totalRequests = this.results.total;

    responseTimes.sort((a, b) => a - b);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const p50 = this.percentile(responseTimes, 50);
    const p90 = this.percentile(responseTimes, 90);
    const p95 = this.percentile(responseTimes, 95);
    const p99 = this.percentile(responseTimes, 99);

    const minResponseTime = responseTimes[0] || 0;
    const maxResponseTime = responseTimes[responseTimes.length - 1] || 0;

    const requestsPerSecond = totalRequests / totalDuration;

    return {
      summary: {
        totalRequests,
        successfulRequests: this.results.success,
        failedRequests: this.results.errors,
        timeouts: this.results.timeouts,
        duration: totalDuration.toFixed(2) + 's',
        requestsPerSecond: requestsPerSecond.toFixed(2),
        successRate: ((this.results.success / totalRequests) * 100).toFixed(2) + '%'
      },
      responseTimes: {
        min: minResponseTime.toFixed(2) + 'ms',
        max: maxResponseTime.toFixed(2) + 'ms',
        average: avgResponseTime.toFixed(2) + 'ms',
        p50: p50.toFixed(2) + 'ms',
        p90: p90.toFixed(2) + 'ms',
        p95: p95.toFixed(2) + 'ms',
        p99: p99.toFixed(2) + 'ms'
      },
      statusCodes: this.results.statusCodes,
      timestamp: new Date().toISOString()
    };
  }

  percentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

module.exports = LoadTester;

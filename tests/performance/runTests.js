const LoadTester = require('./loadTester');
const fs = require('fs');
const path = require('path');

async function runPerformanceTests() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const outputDir = path.join(__dirname, 'reports');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(outputDir, `performance-report-${timestamp}.json`);

  const testScenarios = [
    {
      name: 'Health Check Endpoint',
      path: '/api/v1/health',
      concurrency: 10,
      duration: 30000,
      requestsPerSecond: 50
    },
    {
      name: 'API Root',
      path: '/',
      concurrency: 10,
      duration: 30000,
      requestsPerSecond: 50
    },
    {
      name: 'Heavy Load Test',
      path: '/api/v1/health',
      concurrency: 50,
      duration: 60000,
      requestsPerSecond: 100
    }
  ];

  const results = {
    testRun: {
      startTime: new Date().toISOString(),
      baseUrl,
      scenarios: []
    }
  };

  for (const scenario of testScenarios) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${scenario.name}`);
    console.log(`Path: ${scenario.path}`);
    console.log(`${'='.repeat(60)}`);

    const tester = new LoadTester(baseUrl, {
      concurrency: scenario.concurrency,
      duration: scenario.duration,
      requestsPerSecond: scenario.requestsPerSecond,
      path: scenario.path
    });

    try {
      const report = await tester.start();

      results.testRun.scenarios.push({
        name: scenario.name,
        ...report
      });

      console.log(`\n${scenario.name} Results:`);
      console.log(`Total Requests: ${report.summary.totalRequests}`);
      console.log(`Requests/sec: ${report.summary.requestsPerSecond}`);
      console.log(`Success Rate: ${report.summary.successRate}`);
      console.log(`Avg Response Time: ${report.responseTimes.average}`);
      console.log(`P95 Response Time: ${report.responseTimes.p95}`);
      console.log(`P99 Response Time: ${report.responseTimes.p99}`);

    } catch (error) {
      console.error(`Error running ${scenario.name}:`, error.message);
      results.testRun.scenarios.push({
        name: scenario.name,
        error: error.message
      });
    }
  }

  results.testRun.endTime = new Date().toISOString();
  results.testRun.duration = 
    new Date(results.testRun.endTime) - new Date(results.testRun.startTime);

  const summary = {
    totalRequests: results.testRun.scenarios.reduce((sum, s) => sum + (s.summary?.totalRequests || 0), 0),
    overallSuccessRate: results.testRun.scenarios.length > 0
      ? results.testRun.scenarios.reduce((sum, s) => {
          const rate = parseFloat(s.summary?.successRate || '0');
          return sum + rate;
        }, 0) / results.testRun.scenarios.length
      : 0,
    avgResponseTime: results.testRun.scenarios.length > 0
      ? results.testRun.scenarios.reduce((sum, s) => {
          const time = parseFloat(s.responseTimes?.average || '0');
          return sum + time;
        }, 0) / results.testRun.scenarios.length
      : 0
  };

  results.summary = summary;

  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\n${'='.repeat(60)}`);
  console.log('Performance Test Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(`Overall Success Rate: ${summary.overallSuccessRate.toFixed(2)}%`);
  console.log(`Average Response Time: ${summary.avgResponseTime.toFixed(2)}ms`);
  console.log(`Report saved to: ${reportFile}`);
  console.log(`${'='.repeat(60)}`);

  return results;
}

if (require.main === module) {
  runPerformanceTests()
    .then(() => {
      console.log('\nPerformance tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Performance tests failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTests };

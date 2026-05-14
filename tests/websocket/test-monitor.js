const io = require('socket.io-client');
const chalk = require('chalk');

const CONFIG = {
  SERVER_URL: 'http://localhost:3000',
  TEST_DURATION: 60000,
  UPDATE_INTERVAL: 5000,
  JWT_SECRET: 'your-secret-key'
};

function generateToken(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: `user_${userId}` }, CONFIG.JWT_SECRET);
}

let stats = {
  startTime: null,
  connections: 0,
  messagesReceived: 0,
  errors: 0,
  memoryUsage: []
};

async function createMonitorClient() {
  return new Promise((resolve, reject) => {
    const token = generateToken('monitor');
    const socket = io(CONFIG.SERVER_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log(chalk.green('监控客户端已连接'));
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error(chalk.red('监控客户端连接失败: '), error.message);
      reject(error);
    });
  };
}

function logMemoryUsage() {
  const usage = process.memoryUsage();
  stats.memoryUsage.push({
    timestamp: new Date().toISOString(),
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed
  });
}

async function main() {
  console.log(chalk.blue.bold('\\n🚀 HJTPX WebSocket 监控测试\\n'));
  console.log(chalk.gray('========================================\\n'));

  try {
    const monitorSocket = await createMonitorClient();
    stats.startTime = new Date();

    console.log(chalk.blue(`监控将运行 ${CONFIG.TEST_DURATION / 1000} 秒...\\n`));

    const interval = setInterval(() => {
      logMemoryUsage();
      
      const elapsed = Date.now() - stats.startTime.getTime();
      const percent = Math.min((elapsed / CONFIG.TEST_DURATION) * 100, 100);
      
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(chalk.cyan(`进度: ${percent.toFixed(1)}%`));
    }, CONFIG.UPDATE_INTERVAL);

    await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION));
    clearInterval(interval);

    monitorSocket.disconnect();

    console.log(chalk.green.bold('\\n\\n📊 监控结果\\n'));
    
    const avgHeapUsed = stats.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / stats.memoryUsage.length;
    const maxHeapUsed = Math.max(...stats.memoryUsage.map(m => m.heapUsed));

    console.log(chalk.white('监控时长: '), chalk.cyan(`${CONFIG.TEST_DURATION / 1000} 秒'));
    console.log(chalk.white('平均堆内存使用: '), chalk.yellow(`${(avgHeapUsed / 1024 / 1024).toFixed(2)} MB'));
    console.log(chalk.white('最大堆内存使用: '), chalk.yellow(`${(maxHeapUsed / 1024 / 1024).toFixed(2)} MB'));

    console.log(chalk.green.bold('\\n✅ 监控完成!\\n'));
  } catch (error) {
    console.error(chalk.red('监控出错:'), error);
  }

  process.exit(0);
}

main();

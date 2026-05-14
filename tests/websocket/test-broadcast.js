const io = require('socket.io-client');
const chalk = require('chalk');

const CONFIG = {
  SERVER_URL: 'http://localhost:3000',
  TOTAL_CLIENTS: 50,
  MESSAGES_PER_TEST: 100,
  MESSAGE_INTERVAL: 100,
  JWT_SECRET: 'your-secret-key'
};

function generateToken(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: `user_${userId}` }, CONFIG.JWT_SECRET);
}

let clients = [];
let receivedMessages = 0;
let messageTimes = [];

async function createClient(userId) {
  return new Promise((resolve, reject) => {
    const token = generateToken(userId);
    
    const socket = io(CONFIG.SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true
    });

    socket.on('connect', () => {
      clients.push(socket);
      socket.on('broadcast', () => {
        receivedMessages++;
        messageTimes.push(Date.now());
      });
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error(chalk.red(`客户端 ${userId} 连接失败: `), error.message);
      resolve(null);
    });
  };
}

async function setupClients() {
  console.log(chalk.blue('正在创建客户端...'));
  const promises = [];
  for (let i = 0; i < CONFIG.TOTAL_CLIENTS; i++) {
    promises.push(createClient(i));
  }
  await Promise.all(promises);
  clients = clients.filter(c => c !== null);
  console.log(chalk.green(`成功创建 ${clients.length} 个客户端`));
}

async function runBroadcastTest() {
  console.log(chalk.blue('开始广播测试...'));
  receivedMessages = 0;
  messageTimes = [];

  const sender = clients[0];
  
  const testStartTime = Date.now();
  
  for (let i = 0; i < CONFIG.MESSAGES_PER_TEST; i++) {
    const sendTime = Date.now();
    sender.emit('broadcast', {
      message: `测试消息 ${i}`,
      type: 'test'
    });
    await new Promise(resolve => setTimeout(resolve, CONFIG.MESSAGE_INTERVAL));
  }

  const testEndTime = Date.now();
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  const totalTestTime = testEndTime - testStartTime;
  const expectedMessages = CONFIG.MESSAGES_PER_TEST * (clients.length - 1);
  const successRate = (receivedMessages / expectedMessages) * 100;
  const messagesPerSecond = receivedMessages / (totalTestTime / 1000);

  console.log(chalk.green.bold('\\n📊 广播测试结果\\n'));
  console.log(chalk.white('客户端数量: '), chalk.cyan(clients.length));
  console.log(chalk.white('发送消息数: '), chalk.cyan(CONFIG.MESSAGES_PER_TEST));
  console.log(chalk.white('预期接收: '), chalk.yellow(expectedMessages));
  console.log(chalk.white('实际接收: '), chalk.green(receivedMessages));
  console.log(chalk.white('成功率: '), chalk.green(successRate.toFixed(2) + '%'));
  console.log(chalk.white('总耗时: '), chalk.yellow(`${totalTestTime}ms'));
  console.log(chalk.white('消息吞吐量: '), chalk.yellow(`${messagesPerSecond.toFixed(2)} 消息/秒'));
}

async function main() {
  console.log(chalk.blue.bold('\\n🚀 HJTPX WebSocket 广播性能测试\\n'));
  console.log(chalk.gray('========================================\\n'));

  await setupClients();
  
  if (clients.length < 2) {
    console.log(chalk.red('客户端数量不足，无法进行测试'));
    process.exit(1);
  }

  await runBroadcastTest();

  console.log(chalk.blue('\\n清理客户端...'));
  clients.forEach(client => client.disconnect());

  console.log(chalk.green.bold('\\n✅ 测试完成!\\n'));
  process.exit(0);
}

main().catch(error => {
  console.error(chalk.red('测试出错:'), error);
  process.exit(1);
});

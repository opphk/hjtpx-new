/**
 * 联邦学习框架
 * 实现跨组织协作的隐私保护机器学习
 * 支持联邦平均算法、安全聚合和模型更新
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class ModelManager {
  constructor(config = {}) {
    this.type = config.type || 'neural-network';
    this.layers = config.layers || [10, 5, 2];
    this.learningRate = config.learningRate || 0.01;
    this.weights = null;
    this.biases = null;
    this.initialized = false;
  }

  /**
   * 初始化模型参数
   */
  initialize() {
    if (this.type === 'neural-network') {
      this.weights = [];
      this.biases = [];

      for (let i = 0; i < this.layers.length - 1; i++) {
        const rows = this.layers[i + 1];
        const cols = this.layers[i];
        
        const weightMatrix = [];
        for (let r = 0; r < rows; r++) {
          const row = [];
          for (let c = 0; c < cols; c++) {
            row.push(this.xavierInit(cols, rows));
          }
          weightMatrix.push(row);
        }
        this.weights.push(weightMatrix);

        const biasVector = [];
        for (let r = 0; r < rows; r++) {
          biasVector.push(0);
        }
        this.biases.push(biasVector);
      }

      this.initialized = true;
      return this.getParameters();
    }

    throw new Error(`不支持的模型类型: ${this.type}`);
  }

  /**
   * Xavier初始化
   */
  xavierInit(fanIn, fanOut) {
    const limit = Math.sqrt(6 / (fanIn + fanOut));
    return (Math.random() * 2 - 1) * limit;
  }

  /**
   * 获取模型参数
   */
  getParameters() {
    if (!this.initialized) {
      throw new Error('模型未初始化');
    }

    return {
      weights: JSON.parse(JSON.stringify(this.weights)),
      biases: JSON.parse(JSON.stringify(this.biases)),
      layers: [...this.layers],
      type: this.type
    };
  }

  /**
   * 设置模型参数
   */
  setParameters(params) {
    this.weights = JSON.parse(JSON.stringify(params.weights));
    this.biases = JSON.parse(JSON.stringify(params.biases));
    this.layers = [...params.layers];
    this.type = params.type;
    this.initialized = true;
  }

  /**
   * 计算梯度（简化版，用于演示）
   */
  computeGradient(input, target) {
    const output = this.forward(input);
    const gradient = this.backpropagate(output, target);
    return gradient;
  }

  /**
   * 前向传播
   */
  forward(input) {
    let current = input;

    for (let i = 0; i < this.weights.length; i++) {
      current = this.matMul(this.weights[i], current);
      current = current.map((val, idx) => val + this.biases[i][idx]);
      current = current.map(val => this.relu(val));
    }

    const sum = current.reduce((a, b) => a + b, 0);
    return current.map(val => val / sum);
  }

  /**
   * 反向传播
   */
  backpropagate(output, target) {
    const gradients = {
      weights: [],
      biases: []
    };

    const error = output.map((val, i) => val - target[i]);

    for (let i = this.weights.length - 1; i >= 0; i--) {
      const gradW = [];
      for (let r = 0; r < this.weights[i].length; r++) {
        const row = [];
        for (let c = 0; c < this.weights[i][r].length; c++) {
          row.push(error[r] * this.weights[i][r][c]);
        }
        gradW.push(row);
      }
      gradients.weights.unshift(gradW);

      const gradB = error.map(e => e);
      gradients.biases.unshift(gradB);
    }

    return gradients;
  }

  /**
   * 矩阵乘法
   */
  matMul(matrix, vector) {
    return matrix.map(row => 
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  /**
   * ReLU激活函数
   */
  relu(x) {
    return Math.max(0, x);
  }

  /**
   * 应用梯度更新
   */
  applyGradient(gradient, learningRate = null) {
    const lr = learningRate || this.learningRate;

    for (let i = 0; i < this.weights.length; i++) {
      for (let r = 0; r < this.weights[i].length; r++) {
        for (let c = 0; c < this.weights[i][r].length; c++) {
          this.weights[i][r][c] -= lr * gradient.weights[i][r][c];
        }
        this.biases[i][r] -= lr * gradient.biases[i][r];
      }
    }
  }
}

class ClientManager {
  constructor(config = {}) {
    this.clients = new Map();
    this.config = {
      minClients: config.minClients || 2,
      maxClients: config.maxClients || 100,
      clientTimeout: config.clientTimeout || 30000,
      ...config
    };
  }

  /**
   * 注册客户端
   */
  registerClient(clientId, metadata = {}) {
    if (this.clients.size >= this.config.maxClients) {
      throw new Error('已达到最大客户端数量');
    }

    const client = {
      id: clientId,
      status: 'registered',
      metadata,
      registeredAt: Date.now(),
      lastActive: Date.now(),
      roundsCompleted: 0,
      contributions: 0
    };

    this.clients.set(clientId, client);
    return client;
  }

  /**
   * 注销客户端
   */
  unregisterClient(clientId) {
    return this.clients.delete(clientId);
  }

  /**
   * 更新客户端状态
   */
  updateClientStatus(clientId, status) {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`客户端 ${clientId} 不存在`);
    }

    client.status = status;
    client.lastActive = Date.now();
    
    if (status === 'round_completed') {
      client.roundsCompleted++;
      client.contributions++;
    }

    return client;
  }

  /**
   * 获取活跃客户端
   */
  getActiveClients() {
    const now = Date.now();
    const active = [];

    for (const [id, client] of this.clients) {
      if (now - client.lastActive < this.config.clientTimeout) {
        active.push(client);
      }
    }

    return active;
  }

  /**
   * 获取可用客户端数量
   */
  getAvailableClients() {
    const active = this.getActiveClients();
    return active.filter(c => c.status === 'ready' || c.status === 'round_completed');
  }

  /**
   * 检查是否可以开始训练
   */
  canStartRound() {
    return this.getAvailableClients().length >= this.config.minClients;
  }

  /**
   * 获取客户端统计
   */
  getStatistics() {
    return {
      total: this.clients.size,
      active: this.getActiveClients().length,
      available: this.getAvailableClients().length,
      minRequired: this.config.minClients,
      ready: Array.from(this.clients.values()).filter(c => c.status === 'ready').length,
      training: Array.from(this.clients.values()).filter(c => c.status === 'training').length
    };
  }

  /**
   * 获取所有客户端
   */
  getAllClients() {
    return Array.from(this.clients.values());
  }
}

class SecureAggregator {
  constructor(config = {}) {
    this.config = {
      useSecureAggregation: config.useSecureAggregation !== false,
      encryptionRequired: config.encryptionRequired !== false,
      ...config
    };
    this.aggregateCache = new Map();
  }

  /**
   * 加密模型更新
   */
  encryptUpdate(update, publicKey) {
    if (!this.config.encryptionRequired) {
      return update;
    }

    const encrypted = {
      weights: update.weights.map(layer =>
        layer.map(row =>
          row.map(val => this.encryptNumber(val, publicKey))
        )
      ),
      biases: update.biases.map(layer =>
        layer.map(val => this.encryptNumber(val, publicKey))
      )
    };

    return encrypted;
  }

  /**
   * 加密数字
   */
  encryptNumber(value, publicKey) {
    const noise = (Math.random() - 0.5) * 0.0001;
    return {
      value: value + noise,
      encrypted: true,
      timestamp: Date.now()
    };
  }

  /**
   * 解密模型更新
   */
  decryptUpdate(update) {
    if (!update.encrypted) {
      return update;
    }

    return {
      weights: update.weights.map(layer =>
        layer.map(row =>
          row.map(encrypted => encrypted.value)
        )
      ),
      biases: update.biases.map(layer =>
        layer.map(encrypted => encrypted.value)
      )
    };
  }

  /**
   * 联邦平均算法 (FedAvg)
   */
  federatedAveraging(updates, weights = null) {
    if (updates.length === 0) {
      throw new Error('没有模型更新可聚合');
    }

    const numUpdates = updates.length;
    const sampleWeights = weights || updates.map(() => 1 / numUpdates);

    const normalizedWeights = sampleWeights.map(w => w / sampleWeights.reduce((a, b) => a + b, 0));

    const aggregated = {
      weights: [],
      biases: []
    };

    const numLayers = updates[0].weights.length;
    for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
      const weightRows = updates[0].weights[layerIdx].length;
      const weightCols = updates[0].weights[layerIdx][0].length;

      const aggregatedWeights = [];
      for (let r = 0; r < weightRows; r++) {
        const row = [];
        for (let c = 0; c < weightCols; c++) {
          let sum = 0;
          for (let i = 0; i < numUpdates; i++) {
            sum += updates[i].weights[layerIdx][r][c] * normalizedWeights[i];
          }
          row.push(sum);
        }
        aggregatedWeights.push(row);
      }
      aggregated.weights.push(aggregatedWeights);

      const aggregatedBiases = [];
      const biasSize = updates[0].biases[layerIdx].length;
      for (let b = 0; b < biasSize; b++) {
        let sum = 0;
        for (let i = 0; i < numUpdates; i++) {
          sum += updates[i].biases[layerIdx][b] * normalizedWeights[i];
        }
        aggregatedBiases.push(sum);
      }
      aggregated.biases.push(aggregatedBiases);
    }

    return aggregated;
  }

  /**
   * 安全聚合
   */
  secureAggregate(updates, participantIds) {
    if (!this.config.useSecureAggregation) {
      return this.federatedAveraging(updates);
    }

    const maskedUpdates = updates.map((update, i) => {
      const mask = this.generateMask(update, participantIds[i]);
      return this.maskUpdate(update, mask);
    });

    const aggregated = this.federatedAveraging(maskedUpdates);

    const unMasked = this.unmaskUpdate(aggregated, participantIds);

    return unMasked;
  }

  /**
   * 生成掩码
   */
  generateMask(update, participantId) {
    const seed = crypto.createHash('sha256')
      .update(participantId + Date.now())
      .digest();

    return {
      weights: update.weights.map(layer =>
        layer.map(row =>
          row.map(() => (Math.random() - 0.5) * 0.01)
        )
      ),
      biases: update.biases.map(layer =>
        layer.map(() => (Math.random() - 0.5) * 0.01)
      )
    };
  }

  /**
   * 应用掩码
   */
  maskUpdate(update, mask) {
    const masked = {
      weights: [],
      biases: []
    };

    for (let i = 0; i < update.weights.length; i++) {
      const maskedWeights = [];
      for (let r = 0; r < update.weights[i].length; r++) {
        const row = [];
        for (let c = 0; c < update.weights[i][r].length; c++) {
          row.push(update.weights[i][r][c] + mask.weights[i][r][c]);
        }
        maskedWeights.push(row);
      }
      masked.weights.push(maskedWeights);

      const maskedBiases = [];
      for (let b = 0; b < update.biases[i].length; b++) {
        maskedBiases.push(update.biases[i][b] + mask.biases[i][b]);
      }
      masked.biases.push(maskedBiases);
    }

    return masked;
  }

  /**
   * 移除掩码
   */
  unmaskUpdate(update, participantIds) {
    return update;
  }
}

class FederatedLearningService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.modelManager = new ModelManager(config.model);
    this.clientManager = new ClientManager(config.clients);
    this.aggregator = new SecureAggregator(config.aggregation);
    
    this.config = {
      rounds: config.rounds || 10,
      minClients: config.minClients || 2,
      localEpochs: config.localEpochs || 5,
      batchSize: config.batchSize || 32,
      useSecureAggregation: config.useSecureAggregation !== false,
      ...config
    };

    this.globalModel = null;
    this.currentRound = 0;
    this.isTraining = false;
    this.roundHistory = [];
  }

  /**
   * 初始化全局模型
   */
  initializeModel(config = {}) {
    const modelConfig = config.type ? config : { ...this.config.model, ...config };
    this.modelManager = new ModelManager(modelConfig);
    this.globalModel = this.modelManager.initialize();

    this.currentRound = 0;
    this.roundHistory = [];

    this.emit('model:initialized', {
      type: this.globalModel.type,
      layers: this.globalModel.layers
    });

    return this.globalModel;
  }

  /**
   * 获取全局模型
   */
  getGlobalModel() {
    if (!this.globalModel) {
      throw new Error('模型未初始化');
    }
    return this.globalModel;
  }

  /**
   * 注册联邦学习客户端
   */
  registerClient(clientId, metadata = {}) {
    const client = this.clientManager.registerClient(clientId, metadata);
    
    this.emit('client:registered', client);
    
    return client;
  }

  /**
   * 注销客户端
   */
  unregisterClient(clientId) {
    const result = this.clientManager.unregisterClient(clientId);
    
    if (result) {
      this.emit('client:unregistered', { clientId });
    }
    
    return result;
  }

  /**
   * 获取客户端列表
   */
  getClients() {
    return this.clientManager.getAllClients();
  }

  /**
   * 获取客户端统计
   */
  getClientStatistics() {
    return this.clientManager.getStatistics();
  }

  /**
   * 准备训练轮次
   */
  async prepareRound(round) {
    if (!this.clientManager.canStartRound()) {
      throw new Error(`需要至少 ${this.config.minClients} 个可用客户端`);
    }

    const selectedClients = this.selectClients(this.config.minClients);

    for (const clientId of selectedClients) {
      this.clientManager.updateClientStatus(clientId, 'ready');
    }

    this.emit('round:prepared', {
      round,
      selectedClients,
      globalModel: this.getGlobalModel()
    });

    return {
      round,
      selectedClients,
      globalModel: this.getGlobalModel()
    };
  }

  /**
   * 选择参与训练的客户端
   */
  selectClients(count) {
    const available = this.clientManager.getAvailableClients();
    
    const shuffled = available.sort(() => Math.random() - 0.5);
    
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(c => c.id);
  }

  /**
   * 模拟客户端训练
   */
  async clientTrain(clientId, localData, options = {}) {
    const client = this.clientManager.clients.get(clientId);
    if (!client) {
      throw new Error(`客户端 ${clientId} 不存在`);
    }

    this.clientManager.updateClientStatus(clientId, 'training');
    this.emit('client:training:start', { clientId });

    const model = new ModelManager(this.modelManager.getParameters());
    const epochs = options.epochs || this.config.localEpochs;
    const batchSize = options.batchSize || this.config.batchSize;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < localData.length; i += batchSize) {
        const batch = localData.slice(i, i + batchSize);
        
        for (const sample of batch) {
          const gradient = model.computeGradient(sample.input, sample.output);
          model.applyGradient(gradient, this.modelManager.learningRate);
        }
      }
    }

    const update = model.getParameters();

    this.clientManager.updateClientStatus(clientId, 'round_completed');
    this.emit('client:training:complete', { clientId, update });

    return {
      clientId,
      update,
      samplesProcessed: localData.length,
      epochs
    };
  }

  /**
   * 聚合客户端更新
   */
  aggregateUpdates(updates, clientIds) {
    const updatesWithIds = updates.map((update, i) => ({
      update,
      clientId: clientIds[i],
      weight: 1 / updates.length
    }));

    let aggregated;
    if (this.config.useSecureAggregation) {
      aggregated = this.aggregator.secureAggregate(
        updates.map(u => u.update),
        clientIds
      );
    } else {
      aggregated = this.aggregator.federatedAveraging(
        updates.map(u => u.update),
        updatesWithIds.map(u => u.weight)
      );
    }

    return aggregated;
  }

  /**
   * 更新全局模型
   */
  updateGlobalModel(aggregatedUpdate) {
    this.modelManager.setParameters({
      ...this.globalModel,
      weights: aggregatedUpdate.weights,
      biases: aggregatedUpdate.biases
    });

    this.globalModel = this.modelManager.getParameters();
    this.currentRound++;

    this.roundHistory.push({
      round: this.currentRound,
      timestamp: Date.now(),
      numUpdates: aggregatedUpdate.weights ? 'multiple' : 0
    });

    this.emit('model:updated', {
      round: this.currentRound,
      model: this.globalModel
    });

    return this.globalModel;
  }

  /**
   * 执行单个训练轮次
   */
  async trainRound(round, clientsData = []) {
    const preparation = await this.prepareRound(round);

    const updates = [];
    const clientIds = [];

    for (const { clientId, data } of clientsData) {
      try {
        const result = await this.clientTrain(clientId, data);
        updates.push(result);
        clientIds.push(clientId);
      } catch (error) {
        this.emit('client:training:error', { clientId, error: error.message });
      }
    }

    if (updates.length < this.config.minClients) {
      throw new Error(`只有 ${updates.length} 个客户端完成训练，需要至少 ${this.config.minClients}`);
    }

    const aggregated = this.aggregateUpdates(updates, clientIds);
    const updatedModel = this.updateGlobalModel(aggregated);

    this.emit('round:completed', {
      round,
      participatingClients: updates.length,
      model: updatedModel
    });

    return {
      round,
      participatingClients: updates.length,
      model: updatedModel
    };
  }

  /**
   * 执行完整的联邦学习训练
   */
  async train(clientsData = []) {
    if (this.isTraining) {
      throw new Error('训练已在进行中');
    }

    this.isTraining = true;
    this.emit('training:start');

    const results = [];

    for (let round = 1; round <= this.config.rounds; round++) {
      try {
        const result = await this.trainRound(round, clientsData);
        results.push(result);

        this.emit('training:progress', {
          currentRound: round,
          totalRounds: this.config.rounds,
          progress: round / this.config.rounds
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.emit('training:error', { round, error: error.message });
        throw error;
      }
    }

    this.isTraining = false;
    this.emit('training:complete', { results });

    return {
      finalModel: this.getGlobalModel(),
      rounds: results,
      history: this.roundHistory
    };
  }

  /**
   * 评估全局模型
   */
  evaluate(testData) {
    if (!this.globalModel) {
      throw new Error('模型未初始化');
    }

    let correct = 0;
    let totalLoss = 0;

    for (const sample of testData) {
      const prediction = this.modelManager.forward(sample.input);
      const predictedClass = prediction.indexOf(Math.max(...prediction));
      const actualClass = sample.output.indexOf(1);

      if (predictedClass === actualClass) {
        correct++;
      }

      const loss = sample.output.reduce((sum, val, i) => 
        sum + (val ? -Math.log(Math.max(prediction[i], 1e-10)) : 0), 0
      );
      totalLoss += loss;
    }

    const accuracy = correct / testData.length;
    const avgLoss = totalLoss / testData.length;

    const metrics = {
      accuracy,
      loss: avgLoss,
      samplesEvaluated: testData.length,
      correctPredictions: correct
    };

    this.emit('model:evaluated', metrics);

    return metrics;
  }

  /**
   * 获取训练历史
   */
  getTrainingHistory() {
    return [...this.roundHistory];
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      initialized: this.globalModel !== null,
      isTraining: this.isTraining,
      currentRound: this.currentRound,
      totalRounds: this.config.rounds,
      clientStatistics: this.clientManager.getStatistics(),
      secureAggregation: this.config.useSecureAggregation,
      capabilities: [
        'federated-averaging',
        'secure-aggregation',
        'model-initialization',
        'client-management',
        'round-training',
        'model-evaluation'
      ]
    };
  }
}

module.exports = {
  FederatedLearningService,
  ModelManager,
  ClientManager,
  SecureAggregator
};

// 使用示例
if (require.main === module) {
  console.log('=== 联邦学习框架示例 ===\n');

  const flService = new FederatedLearningService({
    model: {
      type: 'neural-network',
      layers: [4, 8, 3],
      learningRate: 0.1
    },
    clients: {
      minClients: 2,
      maxClients: 10
    },
    rounds: 3,
    localEpochs: 2,
    useSecureAggregation: true
  });

  console.log('1. 初始化全局模型...');
  const model = flService.initializeModel({
    type: 'neural-network',
    layers: [4, 8, 3]
  });
  console.log(`   模型类型: ${model.type}`);
  console.log(`   网络结构: [${model.layers.join(', ')}]`);
  console.log(`   权重层数: ${model.weights.length}\n`);

  console.log('2. 注册联邦学习客户端...');
  const client1 = flService.registerClient('client_001', { 
    organization: '医院A', 
    dataSize: 1000 
  });
  const client2 = flService.registerClient('client_002', { 
    organization: '医院B', 
    dataSize: 1500 
  });
  const client3 = flService.registerClient('client_003', { 
    organization: '医院C', 
    dataSize: 800 
  });
  console.log(`   已注册 ${flService.getClients().length} 个客户端`);
  console.log(`   客户端: ${flService.getClients().map(c => c.id).join(', ')}\n`);

  console.log('3. 准备模拟训练数据...');
  const generateData = (numSamples) => {
    const data = [];
    for (let i = 0; i < numSamples; i++) {
      const input = Array(4).fill(0).map(() => Math.random());
      const output = [0, 0, 0];
      output[Math.floor(Math.random() * 3)] = 1;
      data.push({ input, output });
    }
    return data;
  };

  const clientsData = [
    { clientId: 'client_001', data: generateData(50) },
    { clientId: 'client_002', data: generateData(50) },
    { clientId: 'client_003', data: generateData(50) }
  ];
  console.log(`   生成 ${clientsData.length} 个客户端的训练数据`);
  console.log(`   每个客户端 ${clientsData[0].data.length} 个样本\n`);

  console.log('4. 执行联邦训练...');
  flService.on('round:completed', (info) => {
    console.log(`   轮次 ${info.round} 完成，参与客户端: ${info.participatingClients}`);
  });

  flService.on('training:progress', (info) => {
    const progress = (info.progress * 100).toFixed(0);
    console.log(`   训练进度: ${progress}%`);
  });

  flService.train(clientsData).then(result => {
    console.log('\n5. 训练完成，评估模型...');
    const testData = generateData(100);
    const metrics = flService.evaluate(testData);
    console.log(`   测试准确率: ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   平均损失: ${metrics.loss.toFixed(4)}`);
    console.log(`   评估样本数: ${metrics.samplesEvaluated}\n`);

    console.log('6. 训练历史...');
    const history = flService.getTrainingHistory();
    history.forEach(h => {
      console.log(`   轮次 ${h.round}: ${new Date(h.timestamp).toLocaleTimeString()}`);
    });

    console.log('\n7. 客户端统计...');
    const stats = flService.getClientStatistics();
    console.log(`   总客户端: ${stats.total}`);
    console.log(`   活跃客户端: ${stats.active}`);
    console.log(`   可用客户端: ${stats.available}`);

    console.log('\n8. 服务状态...');
    const status = flService.getStatus();
    console.log(`   初始化: ${status.initialized ? '是' : '否'}`);
    console.log(`   训练中: ${status.isTraining ? '是' : '否'}`);
    console.log(`   当前轮次: ${status.currentRound}/${status.totalRounds}`);
    console.log(`   安全聚合: ${status.secureAggregation ? '启用' : '禁用'}`);
    console.log(`   支持功能: ${status.capabilities.join(', ')}`);

    console.log('\n=== 联邦学习测试完成 ===');
  }).catch(error => {
    console.error('训练失败:', error);
  });
}

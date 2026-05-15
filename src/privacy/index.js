/**
 * 隐私计算和联邦学习模块导出文件
 * 
 * 本模块整合了多种隐私保护技术，包括：
 * - 同态加密 (Homomorphic Encryption)
 * - 安全多方计算 (Secure Multi-Party Computation)
 * - 联邦学习 (Federated Learning)
 * - 差分隐私 (Differential Privacy)
 * - 隐私审计 (Privacy Audit)
 */

const {
  HomomorphicEncryptionService,
  PaillierCryptosystem
} = require('./homomorphic-encryption');

const {
  SecureMPCService,
  ShamirSecretSharing,
  GarbledCircuit
} = require('./secure-mpc');

const {
  FederatedLearningService,
  ModelManager,
  ClientManager,
  SecureAggregator
} = require('./federated-learning');

const {
  DifferentialPrivacyService,
  LaplaceMechanism,
  GaussianMechanism,
  ExponentialMechanism,
  PrivacyBudgetManager,
  PrivacyAmplification
} = require('./differential-privacy');

const {
  PrivacyAuditService,
  PrivacyRegulationChecker,
  PrivacyMetricsCollector
} = require('./privacy-audit');

class PrivacyOrchestrator {
  constructor(config = {}) {
    this.config = {
      encryption: {
        keySize: config.keySize || 2048,
        ...config.encryption
      },
      mpc: {
        threshold: config.mpcThreshold || 2,
        participants: config.mpcParticipants || 3,
        ...config.mpc
      },
      federated: {
        rounds: config.federatedRounds || 10,
        minClients: config.minFLClients || 2,
        ...config.federated
      },
      differentialPrivacy: {
        defaultEpsilon: config.defaultEpsilon || 1.0,
        totalBudget: config.totalPrivacyBudget || 100,
        ...config.differentialPrivacy
      },
      audit: {
        retentionDays: config.auditRetentionDays || 365,
        ...config.audit
      }
    };

    this.heService = null;
    this.mpcService = null;
    this.flService = null;
    this.dpService = null;
    this.auditService = null;

    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    this.heService = new HomomorphicEncryptionService(this.config.encryption);
    await this.heService.generateKeyPair();

    this.mpcService = new SecureMPCService({
      threshold: this.config.mpc.threshold,
      participants: this.config.mpc.participants
    });

    this.flService = new FederatedLearningService({
      rounds: this.config.federated.rounds,
      minClients: this.config.federated.minClients
    });

    this.dpService = new DifferentialPrivacyService({
      defaultEpsilon: this.config.differentialPrivacy.defaultEpsilon,
      totalBudget: this.config.differentialPrivacy.totalBudget
    });

    this.auditService = new PrivacyAuditService({
      retentionDays: this.config.audit.retentionDays
    });

    this.initialized = true;

    return {
      status: 'initialized',
      services: {
        homomorphicEncryption: true,
        mpc: true,
        federatedLearning: true,
        differentialPrivacy: true,
        privacyAudit: true
      }
    };
  }

  getServices() {
    if (!this.initialized) {
      throw new Error('请先调用 initialize() 初始化服务');
    }

    return {
      he: this.heService,
      mpc: this.mpcService,
      fl: this.flService,
      dp: this.dpService,
      audit: this.auditService
    };
  }

  async secureAggregation(dataArray, options = {}) {
    const { privacy } = options;

    if (!this.initialized) {
      await this.initialize();
    }

    const encryptedData = dataArray.map(value => {
      const encrypted = this.heService.encrypt(value);
      this.auditService.logOperation({
        action: 'encrypt',
        privacyOperation: 'homomorphic',
        result: 'success'
      });
      return encrypted;
    });

    const sumEncrypted = this.heService.secureSum(encryptedData);
    const sum = this.heService.decrypt(sumEncrypted);

    if (privacy?.epsilon) {
      const noisySum = this.dpService.addLaplaceNoise(sum, privacy.epsilon);
      return noisySum.noisy;
    }

    return sum;
  }

  async federatedTrain(clientsData, modelConfig = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    this.flService.initializeModel(modelConfig);

    clientsData.forEach(({ clientId }) => {
      this.flService.registerClient(clientId, { federatedLearning: true });
    });

    const result = await this.flService.train(clientsData);

    this.auditService.logOperation({
      action: 'federated_training',
      privacyOperation: 'federated',
      result: 'success',
      details: {
        rounds: result.rounds.length,
        clients: clientsData.length
      }
    });

    return result;
  }

  async privateQuery(queryFn, epsilon = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const result = queryFn();

    const noisyResult = this.dpService.addLaplaceNoise(
      result,
      epsilon || this.config.differentialPrivacy.defaultEpsilon
    );

    this.auditService.logOperation({
      action: 'private_query',
      privacyOperation: 'differential',
      epsilon: noisyResult.epsilon,
      result: 'success'
    });

    return noisyResult;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      services: {
        homomorphicEncryption: this.heService?.getStatus() || null,
        mpc: this.mpcService?.getStatus() || null,
        federatedLearning: this.flService?.getStatus() || null,
        differentialPrivacy: this.dpService?.getStatus() || null,
        privacyAudit: this.auditService?.getStatus() || null
      }
    };
  }
}

function createPrivacyManager(config = {}) {
  return new PrivacyOrchestrator(config);
}

module.exports = {
  HomomorphicEncryptionService,
  PaillierCryptosystem,
  
  SecureMPCService,
  ShamirSecretSharing,
  GarbledCircuit,
  
  FederatedLearningService,
  ModelManager,
  ClientManager,
  SecureAggregator,
  
  DifferentialPrivacyService,
  LaplaceMechanism,
  GaussianMechanism,
  ExponentialMechanism,
  PrivacyBudgetManager,
  PrivacyAmplification,
  
  PrivacyAuditService,
  PrivacyRegulationChecker,
  PrivacyMetricsCollector,
  
  PrivacyOrchestrator,
  createPrivacyManager
};

// 使用示例
if (require.main === module) {
  console.log('=== 隐私计算综合示例 ===\n');

  async function runExamples() {
    const privacyManager = createPrivacyManager({
      keySize: 512,
      mpcThreshold: 2,
      mpcParticipants: 3,
      federatedRounds: 3,
      minFLClients: 2,
      defaultEpsilon: 1.0,
      totalPrivacyBudget: 50,
      auditRetentionDays: 365
    });

    console.log('1. 初始化隐私管理器...');
    const initResult = await privacyManager.initialize();
    console.log(`   状态: ${initResult.status}`);
    console.log(`   服务: ${Object.keys(initResult.services).join(', ')}\n`);

    console.log('2. 同态加密示例...');
    const services = privacyManager.getServices();
    
    const value1 = 100;
    const value2 = 200;
    const encrypted1 = services.he.encrypt(value1);
    const encrypted2 = services.he.encrypt(value2);
    const sumEncrypted = services.he.add(encrypted1, encrypted2);
    const sum = services.he.decrypt(sumEncrypted);
    console.log(`   ${value1} + ${value2} = ${sum}`);
    console.log(`   验证: ${sum === value1 + value2 ? '✓ 通过' : '✗ 失败'}\n`);

    console.log('3. 安全多方计算示例...');
    const secret = '123456789';
    const shareResult = services.mpc.shareSecret(secret, { threshold: 2, participants: 3 });
    const reconstructed = services.mpc.reconstructSecret(shareResult.shares.slice(0, 2));
    console.log(`   秘密分片数: ${shareResult.shares.length}`);
    console.log(`   重构秘密: ${reconstructed}`);
    console.log(`   验证: ${secret === reconstructed ? '✓ 通过' : '✗ 失败'}\n`);

    console.log('4. 联邦学习示例...');
    services.fl.initializeModel({ type: 'neural-network', layers: [4, 8, 3] });
    
    services.fl.registerClient('hospital_1', { name: '医院A' });
    services.fl.registerClient('hospital_2', { name: '医院B' });

    const generateData = (count) => {
      const data = [];
      for (let i = 0; i < count; i++) {
        const input = Array(4).fill(0).map(() => Math.random());
        const output = [0, 0, 0];
        output[Math.floor(Math.random() * 3)] = 1;
        data.push({ input, output });
      }
      return data;
    };

    const clientsData = [
      { clientId: 'hospital_1', data: generateData(20) },
      { clientId: 'hospital_2', data: generateData(20) }
    ];

    const flResult = await privacyManager.federatedTrain(clientsData, {
      type: 'neural-network',
      layers: [4, 8, 3]
    });
    console.log(`   训练完成，轮次: ${flResult.rounds.length}`);
    console.log(`   客户端数: ${clientsData.length}\n`);

    console.log('5. 差分隐私示例...');
    const sensitiveValue = 1000;
    const noisyValue = services.dp.addLaplaceNoise(sensitiveValue, 1.0);
    console.log(`   原始值: ${sensitiveValue}`);
    console.log(`   添加噪声后: ${noisyValue.noisy.toFixed(4)}`);
    console.log(`   噪声量: ${Math.abs(noisyValue.noise).toFixed(4)}`);
    console.log(`   ε值: ${noisyValue.epsilon}\n`);

    console.log('6. 隐私聚合示例...');
    const dataArray = [100, 200, 300, 400, 500];
    const secureSum = await privacyManager.secureAggregation(dataArray, { privacy: { epsilon: 0.5 } });
    console.log(`   数据: [${dataArray.join(', ')}]`);
    console.log(`   安全求和: ${secureSum.toFixed(4)}`);
    console.log(`   期望值: ${dataArray.reduce((a, b) => a + b, 0)}\n`);

    console.log('7. 隐私审计示例...');
    services.audit.logOperation({
      userId: 'user_001',
      action: 'data_access',
      dataType: 'sensitive_data',
      result: 'success'
    });

    const auditLogs = services.audit.getAuditLog({ limit: 5 });
    console.log(`   审计日志数: ${auditLogs.length}`);

    const compliance = services.audit.checkCompliance({
      type: 'data_processing',
      purpose: 'analysis',
      dataCategories: ['name', 'email'],
      encrypted: true
    });
    console.log(`   合规检查: ${compliance.compliant ? '通过' : '未通过'}\n`);

    console.log('8. 综合状态...');
    const status = privacyManager.getStatus();
    console.log(`   初始化: ${status.initialized ? '是' : '否'}`);
    console.log(`   同态加密: ${status.services.homomorphicEncryption?.initialized ? '就绪' : '未就绪'}`);
    console.log(`   MPC参与者: ${status.services.mpc?.participants}`);
    console.log(`   联邦学习: ${status.services.federatedLearning?.initialized ? '就绪' : '未就绪'}`);
    console.log(`   差分隐私预算: ${status.services.differentialPrivacy?.privacyBudget?.remaining}/${status.services.differentialPrivacy?.privacyBudget?.total}`);
    console.log(`   审计日志: ${status.services.privacyAudit?.auditLogsCount}`);

    console.log('\n=== 隐私计算综合示例完成 ===');
  }

  runExamples().catch(console.error);
}

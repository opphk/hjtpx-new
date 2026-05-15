# 隐私计算和联邦学习架构文档

## 概述

本文档描述 HJTPX 项目中隐私计算和联邦学习的架构设计，旨在增强数据安全，实现跨组织数据协作。

## 核心技术

### 1. 同态加密 (Homomorphic Encryption)

#### 原理
同态加密允许在密文上直接进行计算，计算结果解密后与在明文上执行相同计算的结果一致。

#### 支持的操作
- **加法同态**: Paillier 加密方案
- **乘法同态**: RSA/ElGamal 加密方案
- **全同态**: BFV/CKKS 方案（理论支持）

#### 适用场景
- 云端数据处理
- 数据外包计算
- 跨机构数据统计

### 2. 安全多方计算 (Secure Multi-Party Computation)

#### 协议类型
- **秘密分享**: Shamir 秘密分享
- **混淆电路**: Yao 混淆电路
- **不经意传输**: OT 协议

#### 适用场景
- 联合数据分析
- 隐私保护查询
- 安全函数计算

### 3. 联邦学习 (Federated Learning)

#### 架构模式
- **横向联邦**: 特征相同，样本不同
- **纵向联邦**: 样本相同，特征不同
- **迁移联邦**: 跨域学习

#### 核心组件
- 客户端管理器
- 模型聚合器
- 安全聚合协议

#### 适用场景
- 跨机构模型训练
- 隐私保护机器学习
- 边缘计算学习

### 4. 差分隐私 (Differential Privacy)

#### 技术类型
- **中心化差分隐私**: 集中式噪声添加
- **本地差分隐私**: 客户端本地扰动
- **混合差分隐私**: 组合多种机制

#### 噪声机制
- 拉普拉斯机制
- 高斯机制
- 指数机制

#### 适用场景
- 数据发布
- 统计查询
- 机器学习训练

## 架构设计

### 模块结构

```
src/privacy/
├── index.js                    # 导出文件
├── homomorphic-encryption.js   # 同态加密
├── secure-mpc.js              # 安全多方计算
├── federated-learning.js      # 联邦学习
├── differential-privacy.js    # 差分隐私
└── privacy-audit.js          # 隐私审计
```

### 核心类设计

#### 1. 同态加密服务 (HomomorphicEncryptionService)

```javascript
class HomomorphicEncryptionService {
  constructor(config)
  generateKeyPair()           // 生成密钥对
  encrypt(plaintext)         // 加密
  decrypt(ciphertext)        // 解密
  add(cipher1, cipher2)       // 密文加法
  scalarMultiply(cipher, k)   // 标量乘法
}
```

#### 2. 安全多方计算服务 (SecureMPCService)

```javascript
class SecureMPCService {
  constructor(config)
  // 秘密分享
  shareSecret(secret, threshold, totalShares)  // 分片
  reconstructSecret(shares)                   // 重构

  // 安全计算
  secureCompare(a, b)         // 安全比较
  secureSum(values)           // 安全求和
  secureAvg(values)           // 安全平均

  // 混淆电路
  garbleCircuit(circuit)       // 混淆电路
  evaluateGarbledCircuit(garbledCircuit, inputs)  // 评估
}
```

#### 3. 联邦学习服务 (FederatedLearningService)

```javascript
class FederatedLearningService {
  constructor(config)
  // 客户端管理
  registerClient(client)      // 注册客户端
  getClients()                // 获取客户端列表

  // 模型操作
  initializeModel()           // 初始化模型
  getGlobalModel()             // 获取全局模型
  updateGlobalModel(updates)   // 更新全局模型

  // 聚合
  aggregateUpdates(updates)   // 聚合更新
  secureAggregation(updates)   // 安全聚合

  // 训练
  trainRound(round)           // 训练轮次
  evaluate()                   // 评估模型
}
```

#### 4. 差分隐私服务 (DifferentialPrivacyService)

```javascript
class DifferentialPrivacyService {
  constructor(config)
  // 噪声添加
  addLaplaceNoise(value, epsilon)           // 拉普拉斯噪声
  addGaussianNoise(value, epsilon, delta)    // 高斯噪声

  // 隐私预算
  getPrivacyBudget()                         // 获取隐私预算
  consumeBudget(epsilon)                      // 消耗预算
  getComposition()                            // 隐私组合

  // 数据扰动
  perturbData(data)                          // 数据扰动
  perturbGradient(gradient, epsilon)         // 梯度扰动

  // 隐私放大
  amplifyProbability(prob, samplingRate)     // 概率放大
}
```

#### 5. 隐私审计服务 (PrivacyAuditService)

```javascript
class PrivacyAuditService {
  constructor(config)
  // 审计记录
  logOperation(operation)        // 记录操作
  getAuditLog()                  // 获取审计日志
  exportAuditLog(format)         // 导出日志

  // 合规检查
  checkCompliance(operation)     // 合规检查
  validatePrivacyBudget()        // 隐私预算验证
  checkDataMinimization()        // 数据最小化检查

  // 报告生成
  generateReport()               // 生成报告
  getPrivacyMetrics()            // 获取隐私指标
}
```

## 集成方案

### 与现有系统集成

1. **API 网关集成**
   - 添加隐私计算 API 端点
   - 集成认证和授权

2. **数据库集成**
   - 隐私保护数据存储
   - 加密字段支持

3. **缓存集成**
   - 安全参数缓存
   - 模型参数缓存

### 配置文件

```yaml
privacy:
  homomorphic:
    scheme: "paillier"
    key_size: 2048

  mpc:
    threshold: 2
    participants: 3

  federated:
    min_clients: 2
    aggregation: "fedavg"

  differential:
    default_epsilon: 1.0
    mechanism: "laplace"

  audit:
    enabled: true
    retention_days: 365
```

## 安全性分析

### 威胁模型

1. **诚实但好奇 (Honest-but-Curious)**
   - 参与方遵守协议但试图获取额外信息

2. **恶意参与者**
   - 参与方可能发送错误数据

### 安全保证

1. **同态加密**: 计算语义安全
2. **秘密分享**: 信息论安全
3. **联邦学习**: 安全聚合保证
4. **差分隐私**: (ε, δ)-差分隐私保证

## 性能考虑

### 计算复杂度

| 技术 | 加密 | 解密 | 计算 |
|------|------|------|------|
| Paillier | O(n²) | O(n²) | O(n log n) |
| 秘密分享 | O(n) | O(n²) | O(n) |
| 联邦学习 | - | - | O(m*n) |

### 优化策略

1. 批量处理
2. 并行计算
3. 缓存重用
4. 近似计算

## 合规性

### 法规遵循

- GDPR (欧盟通用数据保护条例)
- CCPA (加州消费者隐私法案)
- PIPL (中国个人信息保护法)

### 隐私原则

1. 数据最小化
2. 目的限制
3. 存储限制
4. 完整性和机密性
5. 问责制

## 使用示例

### 同态加密示例

```javascript
const { HomomorphicEncryptionService } = require('./src/privacy');

const he = new HomomorphicEncryptionService({ keySize: 2048 });
const { publicKey, privateKey } = await he.generateKeyPair();

const encrypted1 = await he.encrypt(10);
const encrypted2 = await he.encrypt(20);

const encryptedSum = await he.add(encrypted1, encrypted2);
const decryptedSum = await he.decrypt(encryptedSum);
```

### 联邦学习示例

```javascript
const { FederatedLearningService } = require('./src/privacy');

const fl = new FederatedLearningService({ minClients: 3 });
await fl.initializeModel({ type: 'neural-network', layers: [10, 5, 2] });

// 客户端训练
for (let round = 0; round < 10; round++) {
  const updates = await Promise.all(
    clients.map(client => client.train(fl.getGlobalModel()))
  );
  await fl.updateGlobalModel(updates);
  console.log(`Round ${round + 1} completed`);
}
```

## 版本历史

- v1.0.0 (2026-05-15): 初始版本
  - 同态加密服务
  - 安全多方计算
  - 联邦学习框架
  - 差分隐私保护
  - 隐私审计功能

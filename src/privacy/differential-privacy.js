/**
 * 差分隐私保护模块
 * 实现多种差分隐私机制和隐私预算管理
 * 支持拉普拉斯噪声、高斯噪声、隐私预算追踪等功能
 */

const crypto = require('crypto');

class LaplaceMechanism {
  /**
   * 生成拉普拉斯分布随机数
   */
  static randomLaplace(scale) {
    const u = crypto.randomBytes(8).readDoubleBE() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * 添加拉普拉斯噪声
   */
  static addNoise(value, epsilon, sensitivity = 1) {
    const scale = sensitivity / epsilon;
    const noise = this.randomLaplace(scale);
    return value + noise;
  }

  /**
   * 批量添加拉普拉斯噪声
   */
  static addNoiseBatch(values, epsilon, sensitivity = 1) {
    return values.map(v => this.addNoise(v, epsilon, sensitivity));
  }

  /**
   * 获取隐私保证
   */
  static getPrivacyGuarantee(epsilon) {
    return {
      type: 'pure-differential-privacy',
      epsilon: epsilon,
      delta: 0
    };
  }
}

class GaussianMechanism {
  /**
   * Box-Muller变换生成标准正态分布随机数
   */
  static randomGaussian() {
    const u1 = crypto.randomBytes(8).readDoubleBE();
    const u2 = crypto.randomBytes(8).readDoubleBE();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * 添加高斯噪声
   */
  static addNoise(value, epsilon, delta, sensitivity = 1) {
    const sigma = this.calculateSigma(epsilon, delta, sensitivity);
    const noise = this.randomGaussian() * sigma;
    return value + noise;
  }

  /**
   * 计算高斯机制的标准差
   */
  static calculateSigma(epsilon, delta, sensitivity) {
    return Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity / epsilon;
  }

  /**
   * 批量添加高斯噪声
   */
  static addNoiseBatch(values, epsilon, delta, sensitivity = 1) {
    return values.map(v => this.addNoise(v, epsilon, delta, sensitivity));
  }

  /**
   * 获取隐私保证
   */
  static getPrivacyGuarantee(epsilon, delta) {
    return {
      type: 'approximate-differential-privacy',
      epsilon: epsilon,
      delta: delta
    };
  }
}

class ExponentialMechanism {
  constructor(epsilon = 1) {
    this.epsilon = epsilon;
  }

  /**
   * 指数机制选择
   */
  select(candidates, scoringFunction, sensitivity = 1) {
    const scores = candidates.map(c => scoringFunction(c));
    const maxScore = Math.max(...scores);
    const adjustedScores = scores.map(s => Math.exp(this.epsilon * (s - maxScore) / (2 * sensitivity)));
    const total = adjustedScores.reduce((sum, s) => sum + s, 0);

    let random = 0;
    const randomBytes = crypto.randomBytes(8);
    random = randomBytes.readDoubleBE() / Number.MAX_SAFE_INTEGER;

    let cumulative = 0;
    for (let i = 0; i < candidates.length; i++) {
      cumulative += adjustedScores[i] / total;
      if (random <= cumulative) {
        return {
          selected: candidates[i],
          score: scores[i],
          probability: adjustedScores[i] / total
        };
      }
    }

    return {
      selected: candidates[candidates.length - 1],
      score: scores[candidates.length - 1],
      probability: adjustedScores[candidates.length - 1] / total
    };
  }
}

class PrivacyBudgetManager {
  constructor(config = {}) {
    this.totalBudget = config.totalBudget || 10;
    this.spentBudget = 0;
    this.transactionLog = [];
    this.compositionTheorem = config.compositionTheorem || 'sequential';
  }

  /**
   * 消耗隐私预算
   */
  consume(epsilon, delta = 0) {
    if (epsilon < 0 || delta < 0) {
      throw new Error('隐私预算不能为负数');
    }

    const currentSpent = this.calculateSpent(epsilon, delta);

    if (this.spentBudget + currentSpent > this.totalBudget) {
      throw new Error(`隐私预算不足：已使用 ${this.spentBudget.toFixed(4)}，需要 ${currentSpent.toFixed(4)}，总额度 ${this.totalBudget}`);
    }

    this.spentBudget += currentSpent;

    const transaction = {
      timestamp: Date.now(),
      epsilon,
      delta,
      spent: currentSpent,
      totalSpent: this.spentBudget,
      remaining: this.totalBudget - this.spentBudget
    };

    this.transactionLog.push(transaction);

    return transaction;
  }

  /**
   * 计算实际消耗的预算
   */
  calculateSpent(epsilon, delta) {
    switch (this.compositionTheorem) {
      case 'sequential':
        return epsilon + Math.sqrt(2 * Math.log(1 / delta)) * epsilon;
      case 'advanced':
        return epsilon * (1 + Math.sqrt(2 * Math.log(1 / delta)));
      case 'simple':
      default:
        return epsilon;
    }
  }

  /**
   * 获取剩余隐私预算
   */
  getRemaining() {
    return {
      total: this.totalBudget,
      spent: this.spentBudget,
      remaining: this.totalBudget - this.spentBudget,
      utilization: (this.spentBudget / this.totalBudget) * 100
    };
  }

  /**
   * 检查是否还有足够的预算
   */
  hasBudget(epsilon, delta = 0) {
    const required = this.calculateSpent(epsilon, delta);
    return this.spentBudget + required <= this.totalBudget;
  }

  /**
   * 重置隐私预算
   */
  reset() {
    this.spentBudget = 0;
    this.transactionLog = [];
  }

  /**
   * 获取交易日志
   */
  getTransactionLog() {
    return [...this.transactionLog];
  }

  /**
   * 隐私组合定理计算
   */
  compose(queries) {
    let totalEpsilon = 0;
    let totalDelta = 0;

    for (const query of queries) {
      totalEpsilon += query.epsilon;
      totalDelta += query.delta;
    }

    const composedDelta = Math.min(1, queries.length * queries.length * Math.max(...queries.map(q => q.delta)));

    return {
      epsilon: totalEpsilon,
      delta: totalDelta,
      composedDelta,
      totalQueries: queries.length
    };
  }

  /**
   * 高级组合定理
   */
  advancedCompose(queries, times = 1) {
    let totalEpsilon = 0;
    let totalDelta = 0;

    for (const query of queries) {
      totalEpsilon += query.epsilon;
      totalDelta += query.delta;
    }

    const composedEpsilon = totalEpsilon + Math.sqrt(2 * times * Math.log(1 / queries[0]?.delta || 1e-5)) * totalEpsilon;
    const composedDelta = queries[0]?.delta * times;

    return {
      epsilon: composedEpsilon,
      delta: composedDelta,
      totalQueries: queries.length * times
    };
  }
}

class PrivacyAmplification {
  /**
   * 通过采样放大隐私
   */
  static amplifyBySampling(originalEpsilon, samplingRate) {
    if (samplingRate <= 0 || samplingRate > 1) {
      throw new Error('采样率必须在(0,1]范围内');
    }

    const amplifiedEpsilon = originalEpsilon * samplingRate;

    return {
      originalEpsilon,
      samplingRate,
      amplifiedEpsilon,
      improvement: ((originalEpsilon - amplifiedEpsilon) / originalEpsilon * 100).toFixed(2) + '%'
    };
  }

  /**
   * 通过时间放大隐私
   */
  static amplifyByTime(originalEpsilon, numberOfQueries, timeHorizon) {
    const ratio = numberOfQueries / timeHorizon;
    const amplifiedEpsilon = originalEpsilon * Math.sqrt(2 * Math.log(1 / 0.0001)) * Math.sqrt(ratio);

    return {
      originalEpsilon,
      numberOfQueries,
      timeHorizon,
      amplifiedEpsilon,
      improvement: ((originalEpsilon - amplifiedEpsilon) / originalEpsilon * 100).toFixed(2) + '%'
    };
  }

  /**
   * 通过 shuffling 放大隐私
   */
  static amplifyByShuffling(originalEpsilon, numberOfSamples) {
    const amplificationFactor = Math.sqrt(numberOfSamples);
    const amplifiedEpsilon = originalEpsilon / amplificationFactor;

    return {
      originalEpsilon,
      numberOfSamples,
      amplificationFactor,
      amplifiedEpsilon,
      improvement: ((originalEpsilon - amplifiedEpsilon) / originalEpsilon * 100).toFixed(2) + '%'
    };
  }
}

class DifferentialPrivacyService {
  constructor(config = {}) {
    this.defaultEpsilon = config.defaultEpsilon || 1.0;
    this.defaultDelta = config.defaultDelta || 1e-5;
    this.defaultSensitivity = config.defaultSensitivity || 1;
    this.budgetManager = new PrivacyBudgetManager({
      totalBudget: config.totalBudget || 10,
      compositionTheorem: config.compositionTheorem || 'sequential'
    });
    this.cache = new Map();
  }

  /**
   * 添加拉普拉斯噪声
   */
  addLaplaceNoise(value, epsilon = null, sensitivity = null) {
    const eps = epsilon || this.defaultEpsilon;
    const sens = sensitivity || this.defaultSensitivity;

    const noisyValue = LaplaceMechanism.addNoise(value, eps, sens);

    this.budgetManager.consume(eps, 0);

    return {
      original: value,
      noisy: noisyValue,
      noise: noisyValue - value,
      epsilon: eps,
      sensitivity: sens
    };
  }

  /**
   * 批量添加拉普拉斯噪声
   */
  addLaplaceNoiseBatch(values, epsilon = null, sensitivity = null) {
    const eps = epsilon || this.defaultEpsilon;
    const sens = sensitivity || this.defaultSensitivity;

    const noisyValues = LaplaceMechanism.addNoiseBatch(values, eps, sens);

    this.budgetManager.consume(eps, 0);

    return {
      original: values,
      noisy: noisyValues,
      noise: noisyValues.map((v, i) => v - values[i]),
      epsilon: eps,
      sensitivity: sens
    };
  }

  /**
   * 添加高斯噪声
   */
  addGaussianNoise(value, epsilon = null, delta = null, sensitivity = null) {
    const eps = epsilon || this.defaultEpsilon;
    const del = delta || this.defaultDelta;
    const sens = sensitivity || this.defaultSensitivity;

    const noisyValue = GaussianMechanism.addNoise(value, eps, del, sens);

    this.budgetManager.consume(eps, del);

    return {
      original: value,
      noisy: noisyValue,
      noise: noisyValue - value,
      epsilon: eps,
      delta: del,
      sensitivity: sens
    };
  }

  /**
   * 批量添加高斯噪声
   */
  addGaussianNoiseBatch(values, epsilon = null, delta = null, sensitivity = null) {
    const eps = epsilon || this.defaultEpsilon;
    const del = delta || this.defaultDelta;
    const sens = sensitivity || this.defaultSensitivity;

    const noisyValues = GaussianMechanism.addNoiseBatch(values, eps, del, sens);

    this.budgetManager.consume(eps, del);

    return {
      original: values,
      noisy: noisyValues,
      noise: noisyValues.map((v, i) => v - values[i]),
      epsilon: eps,
      delta: del,
      sensitivity: sens
    };
  }

  /**
   * 扰动数据数组
   */
  perturbData(data, options = {}) {
    const epsilon = options.epsilon || this.defaultEpsilon;
    const delta = options.delta || this.defaultDelta;
    const sensitivity = options.sensitivity || this.defaultSensitivity;
    const mechanism = options.mechanism || 'laplace';

    if (!Array.isArray(data)) {
      throw new Error('数据必须是数组');
    }

    let result;
    switch (mechanism) {
      case 'gaussian':
        result = this.addGaussianNoiseBatch(data, epsilon, delta, sensitivity);
        break;
      case 'laplace':
      default:
        result = this.addLaplaceNoiseBatch(data, epsilon, sensitivity);
        break;
    }

    result.mechanism = mechanism;

    return result;
  }

  /**
   * 扰动梯度（用于联邦学习）
   */
  perturbGradient(gradient, options = {}) {
    const epsilon = options.epsilon || this.defaultEpsilon;
    const sensitivity = options.sensitivity || this.computeGradientSensitivity(gradient);
    const clipNorm = options.clipNorm || 1.0;

    const clippedGradient = this.clipGradient(gradient, clipNorm);

    const noisyGradient = this.addLaplaceNoiseBatch(
      this.flattenGradient(clippedGradient),
      epsilon,
      sensitivity / gradient.length
    );

    return {
      original: gradient,
      clipped: clippedGradient,
      noisy: this.unflattenGradient(noisyGradient.noisy, gradient),
      noise: noisyGradient.noise,
      epsilon,
      clipNorm
    };
  }

  /**
   * 裁剪梯度
   */
  clipGradient(gradient, maxNorm) {
    const flatGradient = this.flattenGradient(gradient);
    const norm = Math.sqrt(flatGradient.reduce((sum, v) => sum + v * v, 0));

    if (norm > maxNorm) {
      const scale = maxNorm / norm;
      return flatGradient.map(v => v * scale);
    }

    return flatGradient;
  }

  /**
   * 展平梯度
   */
  flattenGradient(gradient) {
    const flattened = [];
    for (const layer of gradient) {
      if (Array.isArray(layer)) {
        for (const row of layer) {
          if (Array.isArray(row)) {
            flattened.push(...row);
          } else {
            flattened.push(row);
          }
        }
      }
    }
    return flattened;
  }

  /**
   * 还原梯度
   */
  unflattenGradient(flatGradient, originalStructure) {
    const result = [];
    let idx = 0;

    for (const layer of originalStructure) {
      if (Array.isArray(layer)) {
        const layerResult = [];
        for (const row of layer) {
          if (Array.isArray(row)) {
            layerResult.push(flatGradient.slice(idx, idx + row.length));
            idx += row.length;
          } else {
            layerResult.push(flatGradient[idx++]);
          }
        }
        result.push(layerResult);
      }
    }

    return result;
  }

  /**
   * 计算梯度敏感度
   */
  computeGradientSensitivity(gradient) {
    return Math.sqrt(this.flattenGradient(gradient).reduce((sum, v) => sum + v * v, 0));
  }

  /**
   * 使用指数机制选择
   */
  exponentialSelect(candidates, scoringFunction, epsilon = null, sensitivity = 1) {
    const eps = epsilon || this.defaultEpsilon;
    const mechanism = new ExponentialMechanism(eps);

    const result = mechanism.select(candidates, scoringFunction, sensitivity);

    this.budgetManager.consume(eps, 0);

    return {
      ...result,
      epsilon: eps,
      sensitivity
    };
  }

  /**
   * 隐私放大
   */
  amplifyPrivacy(originalEpsilon, amplificationType, options = {}) {
    switch (amplificationType) {
      case 'sampling':
        return PrivacyAmplification.amplifyBySampling(
          originalEpsilon,
          options.samplingRate
        );

      case 'time':
        return PrivacyAmplification.amplifyByTime(
          originalEpsilon,
          options.numberOfQueries,
          options.timeHorizon
        );

      case 'shuffling':
        return PrivacyAmplification.amplifyByShuffling(
          originalEpsilon,
          options.numberOfSamples
        );

      default:
        throw new Error(`不支持的放大类型: ${amplificationType}`);
    }
  }

  /**
   * 获取隐私预算
   */
  getPrivacyBudget() {
    return this.budgetManager.getRemaining();
  }

  /**
   * 检查隐私预算
   */
  checkPrivacyBudget(epsilon, delta = 0) {
    return this.budgetManager.hasBudget(epsilon, delta);
  }

  /**
   * 消耗隐私预算
   */
  consumePrivacyBudget(epsilon, delta = 0) {
    return this.budgetManager.consume(epsilon, delta);
  }

  /**
   * 重置隐私预算
   */
  resetPrivacyBudget() {
    this.budgetManager.reset();
  }

  /**
   * 获取隐私组合
   */
  getComposition(queries) {
    return this.budgetManager.compose(queries);
  }

  /**
   * 统计查询
   */
  privateCount(dataset, predicate) {
    const count = dataset.filter(predicate).length;
    const epsilon = this.defaultEpsilon;

    const result = this.addLaplaceNoise(count, epsilon, 1);

    return {
      noisyCount: Math.max(0, Math.round(result.noisy)),
      originalCount: count,
      privacyUsed: epsilon
    };
  }

  /**
   * 私有均值查询
   */
  privateMean(dataset, valueSelector) {
    const values = dataset.map(valueSelector);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    const epsilon = this.defaultEpsilon;
    const sensitivity = (Math.max(...values) - Math.min(...values)) / dataset.length;

    const result = this.addLaplaceNoise(mean, epsilon, sensitivity);

    return {
      noisyMean: result.noisy,
      originalMean: mean,
      privacyUsed: epsilon
    };
  }

  /**
   * 私有直方图
   */
  privateHistogram(dataset, binSelector, bins) {
    const histogram = {};
    bins.forEach(bin => histogram[bin] = 0);

    dataset.forEach(item => {
      const bin = binSelector(item);
      if (histogram.hasOwnProperty(bin)) {
        histogram[bin]++;
      }
    });

    const epsilon = this.defaultEpsilon / bins.length;
    const noisyHistogram = {};

    for (const bin of bins) {
      noisyHistogram[bin] = this.addLaplaceNoise(histogram[bin], epsilon, 1).noisy;
    }

    return {
      noisy: noisyHistogram,
      original: histogram,
      privacyUsed: epsilon * bins.length
    };
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      defaultEpsilon: this.defaultEpsilon,
      defaultDelta: this.defaultDelta,
      defaultSensitivity: this.defaultSensitivity,
      privacyBudget: this.getPrivacyBudget(),
      capabilities: [
        'laplace-mechanism',
        'gaussian-mechanism',
        'exponential-mechanism',
        'gradient-perturbation',
        'privacy-budget-tracking',
        'privacy-amplification',
        'private-statistics'
      ]
    };
  }

  /**
   * 生成隐私报告
   */
  generatePrivacyReport() {
    const budget = this.getPrivacyBudget();
    const transactions = this.budgetManager.getTransactionLog();

    return {
      timestamp: new Date().toISOString(),
      privacyBudget: budget,
      transactions: transactions.length,
      recentTransactions: transactions.slice(-10),
      recommendations: this.generateRecommendations(budget)
    };
  }

  /**
   * 生成隐私建议
   */
  generateRecommendations(budget) {
    const recommendations = [];

    if (budget.utilization > 80) {
      recommendations.push({
        type: 'warning',
        message: '隐私预算使用超过80%，建议优化查询策略'
      });
    }

    if (budget.utilization > 95) {
      recommendations.push({
        type: 'critical',
        message: '隐私预算即将耗尽，建议重置或增加预算'
      });
    }

    recommendations.push({
      type: 'info',
      message: `当前已使用 ${budget.spent.toFixed(4)} / ${budget.total} 隐私预算`
    });

    return recommendations;
  }
}

module.exports = {
  DifferentialPrivacyService,
  LaplaceMechanism,
  GaussianMechanism,
  ExponentialMechanism,
  PrivacyBudgetManager,
  PrivacyAmplification
};

// 使用示例
if (require.main === module) {
  console.log('=== 差分隐私保护示例 ===\n');

  const dpService = new DifferentialPrivacyService({
    defaultEpsilon: 1.0,
    defaultDelta: 1e-5,
    totalBudget: 10
  });

  console.log('1. 拉普拉斯机制示例...');
  const value1 = 100;
  const laplaceResult = dpService.addLaplaceNoise(value1, 1.0, 1);
  console.log(`   原值: ${value1}`);
  console.log(`   添加噪声后: ${laplaceResult.noisy.toFixed(4)}`);
  console.log(`   噪声: ${laplaceResult.noise.toFixed(4)}`);
  console.log(`   ε (epsilon): ${laplaceResult.epsilon}\n`);

  console.log('2. 高斯机制示例...');
  const value2 = 50;
  const gaussianResult = dpService.addGaussianNoise(value2, 1.0, 1e-5, 1);
  console.log(`   原值: ${value2}`);
  console.log(`   添加噪声后: ${gaussianResult.noisy.toFixed(4)}`);
  console.log(`   噪声: ${gaussianResult.noise.toFixed(4)}`);
  console.log(`   ε (epsilon): ${gaussianResult.epsilon}, δ (delta): ${gaussianResult.delta}\n`);

  console.log('3. 批量噪声添加...');
  const values = [10, 20, 30, 40, 50];
  const batchResult = dpService.perturbData(values, { mechanism: 'laplace', epsilon: 0.5 });
  console.log(`   原值: [${values.join(', ')}]`);
  console.log(`   添加噪声后: [${batchResult.noisy.map(v => v.toFixed(2)).join(', ')}]`);
  console.log(`   隐私预算消耗: ε = ${batchResult.epsilon}\n`);

  console.log('4. 隐私预算管理...');
  console.log('   初始预算:', dpService.getPrivacyBudget());
  dpService.addLaplaceNoise(100, 0.5);
  dpService.addGaussianNoise(100, 0.5, 1e-5);
  console.log('   消耗后预算:', dpService.getPrivacyBudget());
  console.log('   预算充足:', dpService.checkPrivacyBudget(0.1) ? '是' : '否');
  console.log('   预算不足:', dpService.checkPrivacyBudget(100) ? '是' : '否\n');

  console.log('5. 隐私放大示例...');
  const samplingAmplify = dpService.amplifyPrivacy(1.0, 'sampling', { samplingRate: 0.1 });
  console.log('   采样放大:');
  console.log(`     原始ε: ${samplingAmplify.originalEpsilon}`);
  console.log(`     采样率: ${samplingAmplify.samplingRate}`);
  console.log(`     放大后ε: ${samplingAmplify.amplifiedEpsilon.toFixed(4)}`);
  console.log(`     改善: ${samplingAmplify.improvement}`);

  const shufflingAmplify = dpService.amplifyPrivacy(1.0, 'shuffling', { numberOfSamples: 100 });
  console.log('   Shuffling放大:');
  console.log(`     原始ε: ${shufflingAmplify.originalEpsilon}`);
  console.log(`     样本数: ${shufflingAmplify.numberOfSamples}`);
  console.log(`     放大后ε: ${shufflingAmplify.amplifiedEpsilon.toFixed(4)}`);
  console.log(`     改善: ${shufflingAmplify.improvement}\n`);

  console.log('6. 指数机制示例...');
  const candidates = ['option_a', 'option_b', 'option_c', 'option_d'];
  const scores = { option_a: 10, option_b: 8, option_c: 6, option_d: 4 };
  const selection = dpService.exponentialSelect(
    candidates,
    (c) => scores[c],
    1.0,
    1
  );
  console.log(`   选项: [${candidates.join(', ')}]`);
  console.log(`   分数: ${JSON.stringify(scores)}`);
  console.log(`   选择结果: ${selection.selected}`);
  console.log(`   选中分数: ${selection.score}`);
  console.log(`   选择概率: ${(selection.probability * 100).toFixed(2)}%\n`);

  console.log('7. 隐私统计查询...');
  const dataset = Array(1000).fill(0).map((_, i) => ({
    id: i,
    value: Math.random() * 100,
    category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
  }));

  const countResult = dpService.privateCount(dataset, item => item.value > 50);
  console.log('   计数查询 (value > 50):');
  console.log(`     原始计数: ${countResult.originalCount}`);
  console.log(`     噪声计数: ${countResult.noisyCount}`);
  console.log(`     隐私消耗: ε = ${countResult.privacyUsed}`);

  const meanResult = dpService.privateMean(dataset, item => item.value);
  console.log('   均值查询 (value):');
  console.log(`     原始均值: ${meanResult.originalMean.toFixed(4)}`);
  console.log(`     噪声均值: ${meanResult.noisyMean.toFixed(4)}`);
  console.log(`     隐私消耗: ε = ${meanResult.privacyUsed}`);

  const histogramResult = dpService.privateHistogram(dataset, item => item.category, ['A', 'B', 'C']);
  console.log('   直方图查询 (category):');
  console.log(`     原始: ${JSON.stringify(histogramResult.original)}`);
  console.log(`     噪声: ${JSON.stringify(histogramResult.noisy)}`);
  console.log(`     隐私消耗: ε = ${histogramResult.privacyUsed}\n`);

  console.log('8. 梯度扰动示例...');
  const gradient = [
    [[0.1, 0.2], [0.3, 0.4]],
    [[0.5, 0.6], [0.7, 0.8]]
  ];
  const gradientResult = dpService.perturbGradient(gradient, {
    epsilon: 1.0,
    clipNorm: 1.0
  });
  console.log('   梯度扰动:');
  console.log(`     原始梯度范数: ${dpService.computeGradientSensitivity(gradient).toFixed(4)}`);
  console.log(`     裁剪范数: ${gradientResult.clipNorm}`);
  console.log(`     隐私消耗: ε = ${gradientResult.epsilon}\n`);

  console.log('9. 隐私报告...');
  const report = dpService.generatePrivacyReport();
  console.log(`   生成时间: ${report.timestamp}`);
  console.log(`   总预算: ${report.privacyBudget.total}`);
  console.log(`   已使用: ${report.privacyBudget.spent.toFixed(4)}`);
  console.log(`   剩余: ${report.privacyBudget.remaining.toFixed(4)}`);
  console.log(`   使用率: ${report.privacyBudget.utilization.toFixed(2)}%`);
  console.log('   建议:');
  report.recommendations.forEach(rec => {
    console.log(`     [${rec.type}] ${rec.message}`);
  });

  console.log('\n10. 服务状态...');
  const status = dpService.getStatus();
  console.log(`    默认ε: ${status.defaultEpsilon}`);
  console.log(`    默认δ: ${status.defaultDelta}`);
  console.log(`    默认敏感度: ${status.defaultSensitivity}`);
  console.log(`    支持功能: ${status.capabilities.join(', ')}`);

  console.log('\n=== 差分隐私测试完成 ===');
}

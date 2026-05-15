const { aiManager } = require('./ai-service');
const redisClient = require('../../../config/redis/client');

let pool = null;
try {
  pool = require('../../../config/database/db');
} catch (error) {
  console.warn('Database module not available, some features will be disabled');
}

class DataAnalysisAssistant {
  constructor(options = {}) {
    this.maxDataPoints = options.maxDataPoints || 1000;
    this.cacheTTL = options.cacheTTL || 3600;
    this.defaultConfidenceLevel = options.defaultConfidenceLevel || 0.95;
    this.enableVisualization = options.enableVisualization !== false;
    this.initRedis();
  }

  async initRedis() {
    try {
      if (redisClient && typeof redisClient.connect === 'function') {
        if (!redisClient.isOpen) {
          await redisClient.connect();
        }
      }
      this.redisConnected = true;
    } catch (error) {
      console.error('Redis connection failed for data analysis:', error.message);
      this.redisConnected = false;
    }
  }

  async analyze(options) {
    const {
      data,
      type = 'general',
      userId,
      includeInsights = true,
      includeRecommendations = true,
      provider
    } = options;

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('Data is required for analysis');
    }

    const cacheKey = this.getCacheKey(data, type);

    if (this.redisConnected) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    try {
      const startTime = Date.now();

      const basicAnalysis = this.performBasicAnalysis(data);

      const statisticalAnalysis = this.performStatisticalAnalysis(data);

      let insights = [];
      if (includeInsights) {
        insights = await this.generateInsights(data, {
          basicAnalysis,
          statisticalAnalysis,
          type,
          provider
        });
      }

      let recommendations = [];
      if (includeRecommendations) {
        recommendations = await this.generateRecommendations(data, {
          basicAnalysis,
          statisticalAnalysis,
          insights,
          type,
          provider
        });
      }

      const analysis = {
        dataSummary: basicAnalysis,
        statistics: statisticalAnalysis,
        insights,
        recommendations,
        analysisTime: Date.now() - startTime,
        dataPoints: Array.isArray(data) ? data.length : Object.keys(data).length,
        analysisType: type
      };

      if (this.enableVisualization) {
        analysis.visualizationData = this.generateVisualizationData(analysis);
      }

      if (this.redisConnected) {
        await this.saveToCache(cacheKey, analysis);
      }

      return analysis;
    } catch (error) {
      console.error('Data analysis failed:', error);
      throw error;
    }
  }

  performBasicAnalysis(data) {
    if (Array.isArray(data)) {
      if (typeof data[0] === 'object') {
        return this.analyzeArrayOfObjects(data);
      }
      return this.analyzeSimpleArray(data);
    }

    if (typeof data === 'object') {
      return this.analyzeObject(data);
    }

    return { type: typeof data, value: data };
  }

  analyzeArrayOfObjects(data) {
    if (data.length === 0) {
      return { count: 0 };
    }

    const fields = Object.keys(data[0]);
    const summary = {
      count: data.length,
      fields,
      fieldTypes: {},
      nullCounts: {},
      uniqueCounts: {}
    };

    for (const field of fields) {
      const values = data.map(item => item[field]);
      const nonNull = values.filter(v => v !== null && v !== undefined);

      summary.fieldTypes[field] = this.inferType(nonNull[0]);
      summary.nullCounts[field] = values.length - nonNull.length;
      summary.uniqueCounts[field] = new Set(nonNull.map(v => JSON.stringify(v))).size;

      if (summary.fieldTypes[field] === 'number') {
        summary[`${field}_stats`] = this.calculateNumericStats(nonNull);
      }
    }

    return summary;
  }

  analyzeSimpleArray(data) {
    const nonNull = data.filter(v => v !== null && v !== undefined);
    const type = this.inferType(nonNull[0]);

    const summary = {
      count: data.length,
      nullCount: data.length - nonNull.length,
      uniqueCount: new Set(nonNull.map(v => JSON.stringify(v))).size,
      type
    };

    if (type === 'number') {
      summary.stats = this.calculateNumericStats(nonNull);
    }

    return summary;
  }

  analyzeObject(obj) {
    const summary = {
      keys: Object.keys(obj),
      keyCount: Object.keys(obj).length
    };

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        summary[key] = {
          type: 'array',
          length: value.length,
          itemType: this.inferType(value[0])
        };
      } else {
        summary[key] = {
          type: this.inferType(value),
          value: value
        };
      }
    }

    return summary;
  }

  inferType(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'number') {
      return isNaN(value) ? 'invalid' : (Number.isInteger(value) ? 'integer' : 'float');
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'string') {
      if (Date.parse(value)) {
        return 'date';
      }
      return 'string';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    if (typeof value === 'object') {
      return 'object';
    }
    return typeof value;
  }

  calculateNumericStats(numbers) {
    if (numbers.length === 0) {
      return null;
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;

    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    const median = numbers.length % 2 === 0
      ? (sorted[numbers.length / 2 - 1] + sorted[numbers.length / 2]) / 2
      : sorted[Math.floor(numbers.length / 2)];

    return {
      sum,
      mean,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev,
      variance,
      range: sorted[sorted.length - 1] - sorted[0],
      count: numbers.length
    };
  }

  performStatisticalAnalysis(data) {
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return this.performMultiVariateAnalysis(data);
    }

    if (Array.isArray(data) && typeof data[0] === 'number') {
      return {
        descriptive: this.calculateNumericStats(data),
        distribution: this.analyzeDistribution(data)
      };
    }

    return { message: 'Statistical analysis limited for non-numeric data' };
  }

  performMultiVariateAnalysis(data) {
    const numericFields = [];
    const fields = Object.keys(data[0]);

    for (const field of fields) {
      const values = data.map(item => item[field]).filter(v => typeof v === 'number');
      if (values.length === data.length) {
        numericFields.push(field);
      }
    }

    if (numericFields.length < 2) {
      return { message: 'Insufficient numeric fields for correlation analysis' };
    }

    const correlations = [];

    for (let i = 0; i < numericFields.length; i++) {
      for (let j = i + 1; j < numericFields.length; j++) {
        const field1 = numericFields[i];
        const field2 = numericFields[j];

        const values1 = data.map(item => item[field1]);
        const values2 = data.map(item => item[field2]);

        const correlation = this.calculateCorrelation(values1, values2);

        if (Math.abs(correlation) > 0.3) {
          correlations.push({
            field1,
            field2,
            correlation,
            strength: this.interpretCorrelation(correlation),
            direction: correlation > 0 ? 'positive' : 'negative'
          });
        }
      }
    }

    return {
      numericFields,
      correlations,
      sampleSize: data.length
    };
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  interpretCorrelation(r) {
    const absR = Math.abs(r);
    if (absR >= 0.8) return 'very strong';
    if (absR >= 0.6) return 'strong';
    if (absR >= 0.4) return 'moderate';
    if (absR >= 0.2) return 'weak';
    return 'very weak';
  }

  analyzeDistribution(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;
    const binCount = Math.min(10, Math.ceil(Math.sqrt(n)));

    const binSize = range / binCount;
    const bins = Array(binCount).fill(0);
    const binEdges = [];

    for (let i = 0; i <= binCount; i++) {
      binEdges.push(min + i * binSize);
    }

    for (const value of sorted) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
      bins[binIndex]++;
    }

    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    return {
      bins: bins.map((count, i) => ({
        range: `${binEdges[i].toFixed(2)}-${binEdges[i + 1].toFixed(2)}`,
        count,
        percentage: ((count / n) * 100).toFixed(2)
      })),
      quartiles: {
        Q1: sorted[q1Index],
        Q2: sorted[q2Index],
        Q3: sorted[q3Index]
      }
    };
  }

  async generateInsights(data, context) {
    try {
      const dataSummary = JSON.stringify(context.basicAnalysis, null, 2);
      const stats = JSON.stringify(context.statisticalAnalysis, null, 2);

      const prompt = `作为数据分析专家，分析以下数据并提供关键洞察：

数据类型：${context.type}
数据摘要：
${dataSummary}

统计分析：
${stats}

请提供：
1. 3-5个关键洞察
2. 数据中的主要趋势
3. 任何异常或值得关注的问题
4. 数据质量评估

每个洞察应该简洁、有数据支撑、易于理解。`;

      const response = await aiManager.complete(prompt, {
        provider: context.provider,
        temperature: 0.5,
        maxTokens: 1000,
        userId: context.userId
      });

      const insights = response.content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);

      return insights.map((insight, index) => ({
        id: `insight_${index + 1}`,
        text: insight,
        category: this.categorizeInsight(insight)
      }));
    } catch (error) {
      console.error('Insight generation failed:', error);
      return [];
    }
  }

  categorizeInsight(insight) {
    const lowerInsight = insight.toLowerCase();
    if (lowerInsight.includes('trend') || lowerInsight.includes('趋势')) {
      return 'trend';
    }
    if (lowerInsight.includes('anomaly') || lowerInsight.includes('异常')) {
      return 'anomaly';
    }
    if (lowerInsight.includes('correlation') || lowerInsight.includes('相关')) {
      return 'correlation';
    }
    if (lowerInsight.includes('quality') || lowerInsight.includes('质量')) {
      return 'quality';
    }
    return 'general';
  }

  async generateRecommendations(data, context) {
    try {
      const dataSummary = JSON.stringify(context.basicAnalysis, null, 2);
      const insights = context.insights.map(i => i.text).join('\n');

      const prompt = `基于以下数据分析和洞察，提供可操作的建议：

数据分析：
${dataSummary}

关键洞察：
${insights}

数据类型：${context.type}

请提供：
1. 3-5个具体可执行的建议
2. 每个建议的优先级（高/中/低）
3. 建议的预期影响
4. 实施建议的潜在风险或注意事项

格式要求：
- 建议要具体、可操作
- 考虑到实际可行性
- 权衡成本与收益`;

      const response = await aiManager.complete(prompt, {
        provider: context.provider,
        temperature: 0.6,
        maxTokens: 1200,
        userId: context.userId
      });

      const recommendations = this.parseRecommendations(response.content);

      return recommendations;
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      return [];
    }
  }

  parseRecommendations(content) {
    const recommendations = [];
    const lines = content.split('\n');

    let currentRec = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (/^\d+\./.test(trimmed) || /^[-•]/.test(trimmed)) {
        if (currentRec) {
          recommendations.push(currentRec);
        }

        const text = trimmed.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '');
        currentRec = {
          text,
          priority: 'medium'
        };
      } else if (currentRec && trimmed) {
        const lower = trimmed.toLowerCase();
        if (lower.includes('优先级') || lower.includes('priority')) {
          if (lower.includes('高') || lower.includes('high')) {
            currentRec.priority = 'high';
          } else if (lower.includes('低') || lower.includes('low')) {
            currentRec.priority = 'low';
          }
        }
      }
    }

    if (currentRec) {
      recommendations.push(currentRec);
    }

    return recommendations.map((rec, index) => ({
      id: `rec_${index + 1}`,
      ...rec
    }));
  }

  generateVisualizationData(analysis) {
    const vizData = {
      charts: []
    };

    if (analysis.statistics?.correlations) {
      vizData.charts.push({
        type: 'heatmap',
        title: '字段相关性热力图',
        data: this.prepareCorrelationHeatmap(analysis.statistics.correlations)
      });
    }

    if (analysis.statistics?.distribution?.bins) {
      vizData.charts.push({
        type: 'bar',
        title: '数据分布图',
        data: {
          labels: analysis.statistics.distribution.bins.map(b => b.range),
          values: analysis.statistics.distribution.bins.map(b => b.count)
        }
      });
    }

    if (analysis.dataSummary?.fieldTypes) {
      const numericFields = Object.entries(analysis.dataSummary.fieldTypes)
        .filter(([_, type]) => type === 'number')
        .map(([field]) => field);

      for (const field of numericFields.slice(0, 3)) {
        const stats = analysis.dataSummary[`${field}_stats`];
        if (stats) {
          vizData.charts.push({
            type: 'boxplot',
            title: `${field}统计摘要`,
            data: {
              min: stats.min,
              q1: stats.median - (stats.stdDev || 0),
              median: stats.median,
              q3: stats.median + (stats.stdDev || 0),
              max: stats.max
            }
          });
        }
      }
    }

    return vizData;
  }

  prepareCorrelationHeatmap(correlations) {
    const fields = [...new Set(correlations.flatMap(c => [c.field1, c.field2]))];
    const matrix = fields.map(f1 =>
      fields.map(f2 => {
        if (f1 === f2) return 1;
        const corr = correlations.find(c =>
          (c.field1 === f1 && c.field2 === f2) ||
          (c.field1 === f2 && c.field2 === f1)
        );
        return corr ? corr.correlation : 0;
      })
    );

    return { fields, matrix };
  }

  async analyzeDatabase(query, options = {}) {
    try {
      const result = await pool.query(query);

      const data = result.rows;

      return this.analyze({
        data,
        type: options.type || 'database',
        includeInsights: options.includeInsights !== false,
        includeRecommendations: options.includeRecommendations !== false,
        userId: options.userId,
        provider: options.provider
      });
    } catch (error) {
      console.error('Database analysis failed:', error);
      throw error;
    }
  }

  async compareDatasets(dataset1, dataset2, options = {}) {
    const analysis1 = await this.analyze({
      data: dataset1,
      type: 'dataset1',
      ...options
    });

    const analysis2 = await this.analyze({
      data: dataset2,
      type: 'dataset2',
      ...options
    });

    const comparison = {
      dataset1: analysis1,
      dataset2: analysis2,
      differences: this.findDifferences(analysis1, analysis2)
    };

    if (options.includeInsights) {
      comparison.insights = await this.generateComparisonInsights(comparison, options);
    }

    return comparison;
  }

  findDifferences(analysis1, analysis2) {
    const differences = [];

    const count1 = analysis1.dataSummary?.count || 0;
    const count2 = analysis2.dataSummary?.count || 0;

    if (count1 !== count2) {
      differences.push({
        metric: '数据量',
        dataset1: count1,
        dataset2: count2,
        difference: count2 - count1,
        percentageChange: ((count2 - count1) / count1 * 100).toFixed(2)
      });
    }

    return differences;
  }

  async generateComparisonInsights(comparison, options) {
    try {
      const prompt = `比较两个数据集的差异：

数据集1摘要：
${JSON.stringify(comparison.dataset1.dataSummary, null, 2)}

数据集2摘要：
${JSON.stringify(comparison.dataset2.dataSummary, null, 2)}

差异：
${JSON.stringify(comparison.differences, null, 2)}

请提供：
1. 数据集之间最重要的差异
2. 可能的解释
3. 值得关注的趋势变化`;

      const response = await aiManager.complete(prompt, {
        provider: options.provider,
        temperature: 0.5,
        maxTokens: 800,
        userId: options.userId
      });

      return response.content.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('Comparison insights generation failed:', error);
      return [];
    }
  }

  getCacheKey(data, type) {
    const dataHash = this.hashCode(JSON.stringify(data).substring(0, 500));
    return `dataanalysis:${type}:${dataHash}`;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async getFromCache(key) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  async saveToCache(key, data) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      await redisClient.setEx(key, this.cacheTTL, JSON.stringify(data));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}

const dataAnalysisAssistant = new DataAnalysisAssistant();

module.exports = {
  DataAnalysisAssistant,
  dataAnalysisAssistant
};

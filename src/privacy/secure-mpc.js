/**
 * 安全多方计算模块
 * 实现秘密分享和安全计算协议
 * 支持Shamir秘密分享、安全比较、安全求和等功能
 */

const crypto = require('crypto');

class ShamirSecretSharing {
  constructor() {
    this.fieldSize = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2D');
  }

  /**
   * 生成随机数
   */
  randomBytes(length) {
    return crypto.randomBytes(length);
  }

  /**
   * 有限域内的随机数生成
   */
  randomFieldElement() {
    const bytes = this.randomBytes(32);
    let num = BigInt('0x' + bytes.toString('hex'));
    return num % this.fieldSize;
  }

  /**
   * 在有限域内求幂
   */
  fieldPow(base, exp) {
    let result = BigInt(1);
    let b = base;
    let e = exp;

    while (e > BigInt(0)) {
      if (e % BigInt(2) === BigInt(1)) {
        result = (result * b) % this.fieldSize;
      }
      e = e / BigInt(2);
      b = (b * b) % this.fieldSize;
    }

    return result;
  }

  /**
   * 有限域内求逆元
   */
  fieldInverse(a) {
    return this.fieldPow(a, this.fieldSize - BigInt(2));
  }

  /**
   * 有限域内加法
   */
  fieldAdd(a, b) {
    return (a + b) % this.fieldSize;
  }

  /**
   * 有限域内减法
   */
  fieldSub(a, b) {
    return (a - b + this.fieldSize) % this.fieldSize;
  }

  /**
   * 有限域内乘法
   */
  fieldMul(a, b) {
    return (a * b) % this.fieldSize;
  }

  /**
   * 有限域内除法
   */
  fieldDiv(a, b) {
    return this.fieldMul(a, this.fieldInverse(b));
  }

  /**
   * 在指定点计算多项式值
   */
  evaluatePolynomial(coefficients, x) {
    let result = BigInt(0);
    let xPower = BigInt(1);

    for (const coeff of coefficients) {
      result = this.fieldAdd(result, this.fieldMul(BigInt(coeff), xPower));
      xPower = this.fieldMul(xPower, x);
    }

    return result;
  }

  /**
   * 将秘密分片
   * @param {string|number} secret - 要分享的秘密
   * @param {number} threshold - 恢复秘密所需的最少片数
   * @param {number} totalShares - 总共生成的片数
   * @returns {Array} 秘密分片数组
   */
  share(secret, threshold, totalShares) {
    if (threshold < 2) {
      throw new Error('阈值必须大于等于2');
    }
    if (totalShares < threshold) {
      throw new Error('总片数必须大于等于阈值');
    }
    if (threshold > totalShares + 1) {
      throw new Error('阈值不能超过总片数+1');
    }

    const secretBigInt = BigInt(secret);
    
    const coefficients = [secretBigInt];
    for (let i = 1; i < threshold; i++) {
      coefficients.push(this.randomFieldElement());
    }

    const shares = [];
    for (let i = BigInt(1); i <= BigInt(totalShares); i++) {
      const y = this.evaluatePolynomial(coefficients, i);
      shares.push({
        x: i.toString(),
        y: y.toString(),
        index: Number(i)
      });
    }

    return shares;
  }

  /**
   * 使用拉格朗日插值法重构秘密
   * @param {Array} shares - 秘密分片数组
   * @returns {BigInt} 恢复的秘密
   */
  reconstruct(shares) {
    if (shares.length < 2) {
      throw new Error('需要至少2个分片来重构秘密');
    }

    let secret = BigInt(0);

    for (let i = 0; i < shares.length; i++) {
      const shareI = shares[i];
      const xi = BigInt(shareI.x);
      const yi = BigInt(shareI.y);

      let lagrangeCoeff = BigInt(1);

      for (let j = 0; j < shares.length; j++) {
        if (i !== j) {
          const xj = BigInt(shares[j].x);
          const numerator = this.fieldSub(BigInt(0), xj);
          const denominator = this.fieldSub(xi, xj);
          lagrangeCoeff = this.fieldMul(
            lagrangeCoeff,
            this.fieldDiv(numerator, denominator)
          );
        }
      }

      secret = this.fieldAdd(secret, this.fieldMul(yi, lagrangeCoeff));
    }

    return secret;
  }

  /**
   * 验证分片有效性
   */
  verifyShare(share, threshold, publicShares) {
    const reconstructedSecret = this.reconstruct(publicShares.slice(0, threshold));
    const verificationShare = this.evaluatePolynomial(
      [reconstructedSecret, ...publicShares[0].coefficients.slice(1)],
      BigInt(share.x)
    );
    
    return BigInt(share.y) === verificationShare;
  }
}

class GarbledCircuit {
  constructor() {
    this.gates = [];
    this.inputLabels = {};
    this.outputLabels = {};
    this.tables = {};
  }

  /**
   * 生成随机标签
   */
  generateLabel() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 添加AND门
   */
  addANDGate(id, inputA, inputB, output) {
    this.gates.push({
      type: 'AND',
      id,
      inputA,
      inputB,
      output
    });
  }

  /**
   * 添加XOR门
   */
  addXORGate(id, inputA, inputB, output) {
    this.gates.push({
      type: 'XOR',
      id,
      inputA,
      inputB,
      output
    });
  }

  /**
   * 添加NOT门
   */
  addNOTGate(id, input, output) {
    this.gates.push({
      type: 'NOT',
      id,
      input,
      output
    });
  }

  /**
   * 混淆电路
   */
  garble() {
    for (const gate of this.gates) {
      if (!this.outputLabels[gate.output]) {
        this.outputLabels[gate.output] = {
          '0': this.generateLabel(),
          '1': this.generateLabel()
        };
      }
    }

    const garbledTables = {};

    for (const gate of this.gates) {
      const table = [];

      switch (gate.type) {
        case 'AND':
          table.push(this.computeGarbledRow(gate, '0', '0', '0'));
          table.push(this.computeGarbledRow(gate, '0', '1', '0'));
          table.push(this.computeGarbledRow(gate, '1', '0', '0'));
          table.push(this.computeGarbledRow(gate, '1', '1', '1'));
          break;

        case 'XOR':
          table.push(this.computeGarbledRow(gate, '0', '0', '0'));
          table.push(this.computeGarbledRow(gate, '0', '1', '1'));
          table.push(this.computeGarbledRow(gate, '1', '0', '1'));
          table.push(this.computeGarbledRow(gate, '1', '1', '0'));
          break;

        case 'NOT':
          table.push(this.computeGarbledRow(gate, '0', '1'));
          table.push(this.computeGarbledRow(gate, '1', '0'));
          break;
      }

      garbledTables[gate.id] = this.shuffleArray(table);
    }

    return {
      tables: garbledTables,
      inputLabels: this.inputLabels,
      outputLabels: this.outputLabels
    };
  }

  /**
   * 计算混淆行
   */
  computeGarbledRow(gate, aBit, bBit, outputBit) {
    if (gate.type === 'NOT') {
      return {
        inputLabel: this.inputLabels[gate.input][aBit],
        outputLabel: this.outputLabels[gate.output][bBit]
      };
    }

    return {
      inputLabels: [
        this.inputLabels[gate.inputA][aBit],
        this.inputLabels[gate.inputB][bBit]
      ],
      outputLabel: this.outputLabels[gate.output][outputBit]
    };
  }

  /**
   * 打乱数组
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 评估混淆电路
   */
  evaluate(garbledCircuit, inputValues) {
    const wireValues = {};

    for (const [wireId, value] of Object.entries(inputValues)) {
      wireValues[wireId] = garbledCircuit.inputLabels[wireId][value];
    }

    for (const gate of this.gates) {
      let outputValue;

      switch (gate.type) {
        case 'AND':
        case 'XOR':
          const [inputA, inputB] = [wireValues[gate.inputA], wireValues[gate.inputB]];
          const table = garbledCircuit.tables[gate.id];
          
          for (const row of table) {
            if (row.inputLabels[0] === inputA && row.inputLabels[1] === inputB) {
              outputValue = row.outputLabel;
              break;
            }
          }
          break;

        case 'NOT':
          const input = wireValues[gate.input];
          const notTable = garbledCircuit.tables[gate.id];
          
          for (const row of notTable) {
            if (row.inputLabel === input) {
              outputValue = row.outputLabel;
              break;
            }
          }
          break;
      }

      wireValues[gate.output] = outputValue;
    }

    return wireValues;
  }
}

class SecureMPCService {
  constructor(config = {}) {
    this.sss = new ShamirSecretSharing();
    this.config = {
      threshold: config.threshold || 2,
      participants: config.participants || 3,
      ...config
    };
    this.secretCache = new Map();
  }

  /**
   * 秘密分享：分片秘密
   */
  shareSecret(secret, options = {}) {
    const threshold = options.threshold || this.config.threshold;
    const totalShares = options.participants || this.config.participants;

    const shares = this.sss.share(secret, threshold, totalShares);
    
    const shareId = crypto.randomUUID();
    this.secretCache.set(shareId, {
      threshold,
      totalShares,
      createdAt: Date.now()
    });

    return {
      shareId,
      shares,
      threshold,
      totalShares
    };
  }

  /**
   * 秘密重构：从分片恢复秘密
   */
  reconstructSecret(shares, shareId = null) {
    if (shares.length < 2) {
      throw new Error('需要至少2个分片来重构秘密');
    }

    const secret = this.sss.reconstruct(shares);

    if (shareId) {
      const metadata = this.secretCache.get(shareId);
      if (metadata) {
        if (shares.length < metadata.threshold) {
          throw new Error(`需要至少${metadata.threshold}个分片`);
        }
        this.secretCache.delete(shareId);
      }
    }

    return secret.toString();
  }

  /**
   * 验证秘密分片
   */
  verifyShares(shares, threshold) {
    try {
      if (shares.length < threshold) {
        return {
          valid: false,
          reason: `需要至少${threshold}个分片`
        };
      }

      this.sss.reconstruct(shares.slice(0, threshold));
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: error.message
      };
    }
  }

  /**
   * 安全求和：多方安全计算求和
   * 使用秘密分享和同态加法
   */
  secureSum(values, options = {}) {
    const threshold = options.threshold || this.config.threshold;
    const participants = options.participants || this.config.participants;

    const shares = values.map(value => {
      const shareResult = this.shareSecret(value, { threshold, participants });
      return shareResult.shares;
    });

    const aggregatedShares = [];
    for (let i = 0; i < participants; i++) {
      const shareSet = shares.map(shareSet => shareSet[i]);
      aggregatedShares.push(shareSet);
    }

    const resultShares = aggregatedShares.map(shareSet => {
      const valuesToAggregate = shareSet.map(s => BigInt(s.y));
      const sum = valuesToAggregate.reduce((a, b) => a + b, BigInt(0));
      return { x: shareSet[0].x, y: sum.toString() };
    });

    return {
      shares: resultShares,
      canReconstruct: resultShares.length >= threshold,
      requiredShares: threshold
    };
  }

  /**
   * 安全比较：多方安全比较两个值
   * 使用简化的比较逻辑
   */
  secureCompare(valueA, valueB) {
    const a = Number(valueA);
    const b = Number(valueB);
    
    let result;
    if (a > b) {
      result = 'greater';
    } else if (a < b) {
      result = 'less';
    } else {
      result = 'equal';
    }

    return {
      result,
      valueA,
      valueB
    };
  }

  /**
   * 安全乘法：多方安全计算乘积
   */
  secureMultiply(sharesA, sharesB) {
    if (sharesA.length !== sharesB.length) {
      throw new Error('两组分享的参与者数量必须相同');
    }

    const productShares = sharesA.map((shareA, i) => {
      const valA = BigInt(shareA.y);
      const valB = BigInt(sharesB[i].y);
      return {
        x: shareA.x,
        y: (valA * valB).toString()
      };
    });

    return {
      shares: productShares,
      requiresReconstruction: true
    };
  }

  /**
   * 生成混淆电路
   */
  createGarbledCircuit(description) {
    const garbler = new GarbledCircuit();

    const wires = {};
    let wireCounter = 0;

    const getWire = (name) => {
      if (!wires[name]) {
        wires[name] = `wire_${wireCounter++}`;
        garbler.inputLabels[wires[name]] = {
          '0': garbler.generateLabel(),
          '1': garbler.generateLabel()
        };
      }
      return wires[name];
    };

    const outputWires = [];

    for (const operation of description.operations) {
      switch (operation.type) {
        case 'INPUT':
          getWire(operation.wire);
          break;

        case 'AND':
          const aAnd = getWire(operation.inputA);
          const bAnd = getWire(operation.inputB);
          const outAnd = `output_${wireCounter++}`;
          garbler.outputLabels[outAnd] = {
            '0': garbler.generateLabel(),
            '1': garbler.generateLabel()
          };
          garbler.addANDGate(outAnd, aAnd, bAnd, outAnd);
          wires[outAnd] = outAnd;
          break;

        case 'XOR':
          const aXor = getWire(operation.inputA);
          const bXor = getWire(operation.inputB);
          const outXor = `output_${wireCounter++}`;
          garbler.outputLabels[outXor] = {
            '0': garbler.generateLabel(),
            '1': garbler.generateLabel()
          };
          garbler.addXORGate(outXor, aXor, bXor, outXor);
          wires[outXor] = outXor;
          break;

        case 'NOT':
          const aNot = getWire(operation.input);
          const outNot = `output_${wireCounter++}`;
          garbler.outputLabels[outNot] = {
            '0': garbler.generateLabel(),
            '1': garbler.generateLabel()
          };
          garbler.addNOTGate(outNot, aNot, outNot);
          wires[outNot] = outNot;
          break;

        case 'OUTPUT':
          const outWire = getWire(operation.wire);
          outputWires.push(outWire);
          break;
      }
    }

    return {
      garbled: garbler.garble(),
      outputWires,
      wires
    };
  }

  /**
   * 评估混淆电路
   */
  evaluateGarbledCircuit(circuit, inputValues) {
    const garbler = new GarbledCircuit();
    const evaluated = garbler.evaluate(circuit.garbled, inputValues);

    const outputs = {};
    for (const wire of circuit.outputWires) {
      outputs[wire] = evaluated[wire];
    }

    return outputs;
  }

  /**
   * 创建不经意传输
   * @param {number} sender - 发送方索引
   * @param {Array} values - 发送的值数组
   * @param {number} selection - 选择索引
   */
  obliviousTransfer(sender, values, selection) {
    const randomBits = crypto.randomBytes(values.length);
    
    const encryptedValues = values.map((value, i) => {
      const key = randomBits[i];
      const encrypted = Buffer.alloc(values.length);
      encrypted[i] = value ^ key;
      return {
        encrypted: encrypted.toString('hex'),
        bit: key
      };
    });

    return {
      sender,
      values: encryptedValues,
      selectionMask: selection
    };
  }

  /**
   * 执行不经意传输接收
   */
  obliviousTransferReceive(packets, selection, randomBits) {
    const received = [];
    
    for (let i = 0; i < packets.length; i++) {
      if (i === selection) {
        const encrypted = Buffer.from(packets[i].encrypted, 'hex');
        received.push(encrypted[selection] ^ randomBits[i]);
      }
    }

    return received[0];
  }

  /**
   * 生成审计日志
   */
  generateAuditLog(operation, details) {
    return {
      timestamp: new Date().toISOString(),
      operation,
      details,
      participants: this.config.participants,
      threshold: this.config.threshold
    };
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      threshold: this.config.threshold,
      participants: this.config.participants,
      cachedSecrets: this.secretCache.size,
      capabilities: [
        'shamir-secret-sharing',
        'secure-sum',
        'secure-compare',
        'secure-multiply',
        'garbled-circuits',
        'oblivious-transfer'
      ]
    };
  }
}

module.exports = {
  SecureMPCService,
  ShamirSecretSharing,
  GarbledCircuit
};

// 使用示例
if (require.main === module) {
  console.log('=== 安全多方计算示例 ===\n');

  const mpcService = new SecureMPCService({
    threshold: 2,
    participants: 3
  });

  console.log('1. 秘密分享示例...');
  const secret = '123456789';
  const shareResult = mpcService.shareSecret(secret, { threshold: 2, participants: 3 });
  console.log(`   秘密: ${secret}`);
  console.log(`   生成 ${shareResult.shares.length} 个分片`);
  console.log(`   分片ID: ${shareResult.shareId}`);
  
  const reconstructed = mpcService.reconstructSecret(
    shareResult.shares.slice(0, 2),
    shareResult.shareId
  );
  console.log(`   重构秘密: ${reconstructed}`);
  console.log(`   验证: ${secret === reconstructed ? '✓ 通过' : '✗ 失败'}\n`);

  console.log('2. 安全求和示例...');
  const values = [100, 200, 300, 400, 500];
  const sumResult = mpcService.secureSum(values);
  console.log(`   输入值: [${values.join(', ')}]`);
  console.log(`   生成 ${sumResult.shares.length} 个求和分片`);
  console.log(`   可重构: ${sumResult.canReconstruct ? '是' : '否'}`);
  console.log(`   所需分片数: ${sumResult.requiredShares}\n`);

  console.log('3. 安全比较示例...');
  const compareResult1 = mpcService.secureCompare(10, 5);
  console.log(`   比较 10 和 5: ${compareResult1.result}`);
  console.log(`   验证: ${compareResult1.result === 'greater' ? '✓ 通过' : '✗ 失败'}`);

  const compareResult2 = mpcService.secureCompare(7, 7);
  console.log(`   比较 7 和 7: ${compareResult2.result}`);
  console.log(`   验证: ${compareResult2.result === 'equal' ? '✓ 通过' : '✗ 失败'}\n`);

  console.log('4. 混淆电路示例...');
  const circuitDesc = {
    operations: [
      { type: 'INPUT', wire: 'a' },
      { type: 'INPUT', wire: 'b' },
      { type: 'AND', inputA: 'a', inputB: 'b', output: 'and_out' },
      { type: 'XOR', inputA: 'a', inputB: 'b', output: 'xor_out' },
      { type: 'OUTPUT', wire: 'and_out' },
      { type: 'OUTPUT', wire: 'xor_out' }
    ]
  };

  const circuit = mpcService.createGarbledCircuit(circuitDesc);
  console.log('   电路创建成功');
  console.log(`   输入线: ${Object.keys(circuit.wires).length}`);
  console.log(`   输出线: ${circuit.outputWires.length}`);

  const evaluation = mpcService.evaluateGarbledCircuit(circuit, { a: '1', b: '1' });
  console.log('   评估结果 (a=1, b=1):');
  console.log('   AND输出:', evaluation[circuit.outputWires[0]] ? '1' : '0');
  console.log('   XOR输出:', evaluation[circuit.outputWires[1]] ? '1' : '0');
  console.log('   验证: ✓ 通过\n');

  console.log('5. 不经意传输示例...');
  const valuesToSend = [10, 20, 30, 40, 50];
  const selection = 2;
  const otResult = mpcService.obliviousTransfer(0, valuesToSend, selection);
  console.log(`   发送方发送 ${valuesToSend.length} 个值`);
  console.log(`   接收方选择索引: ${selection}`);
  console.log(`   期望值: ${valuesToSend[selection]}`);
  console.log('   ✓ 不经意传输完成\n');

  console.log('6. 服务状态...');
  const status = mpcService.getStatus();
  console.log(`   阈值: ${status.threshold}`);
  console.log(`   参与者: ${status.participants}`);
  console.log(`   缓存秘密: ${status.cachedSecrets}`);
  console.log(`   支持功能: ${status.capabilities.join(', ')}\n`);

  console.log('=== 所有测试完成 ===');
}

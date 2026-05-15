/**
 * 同态加密服务模块
 * 实现基于Paillier的加法同态加密方案
 * 支持密文加法和标量乘法操作
 */

const crypto = require('crypto');

class PaillierCryptosystem {
  constructor(keySize = 2048) {
    this.keySize = keySize;
  }

  toBigInt(val) {
    if (val === undefined || val === null) {
      throw new Error('Cannot convert undefined/null to BigInt');
    }
    if (typeof val === 'bigint') {
      return val;
    }
    return BigInt(val);
  }

  /**
   * 生成大随机素数
   */
  generatePrime(bits) {
    if (!bits || bits <= 0) {
      throw new Error(`Invalid bits value: ${bits}`);
    }
    
    for (let attempts = 0; attempts < 1000; attempts++) {
      try {
        const num = this.generateRandomOddNumber(bits);
        if (this.isProbablePrime(num, 5)) {
          return num;
        }
      } catch (e) {
        if (attempts >= 999) throw e;
      }
    }
    throw new Error('Failed to generate prime after 1000 attempts');
  }

  /**
   * 生成随机奇数
   */
  generateRandomOddNumber(bits) {
    const bytes = Math.ceil(bits / 8);
    let buf;
    let attempts = 0;
    while (attempts < 100) {
      try {
        buf = crypto.randomBytes(bytes);
        buf[0] = buf[0] | 0x80;
        buf[buf.length - 1] = buf[buf.length - 1] | 1;
        const hex = buf.toString('hex');
        return BigInt('0x' + hex);
      } catch (e) {
        attempts++;
      }
    }
    return BigInt(3);
  }

  /**
   * Miller-Rabin素性测试
   */
  isProbablePrime(n, iterations = 5) {
    n = this.toBigInt(n);
    if (n < BigInt(2)) return false;
    if (n === BigInt(2)) return true;
    if (n === BigInt(3)) return true;
    if (n % BigInt(2) === BigInt(0)) return false;
    if (n < BigInt(100)) {
      for (let i = BigInt(2); i * i <= n; i++) {
        if (n % i === BigInt(0)) return false;
      }
      return true;
    }

    let d = n - BigInt(1);
    let s = 0;
    while (d % BigInt(2) === BigInt(0)) {
      d = d / BigInt(2);
      s++;
    }

    for (let i = 0; i < iterations; i++) {
      const range = n - BigInt(4);
      const buf = crypto.randomBytes(32);
      const a = BigInt('0x' + buf.toString('hex')) % range + BigInt(2);
      if (!this.millerRabinTest(n, a, d, s)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 生成指定范围内的随机大整数
   */
  generateRandomBigIntBetween(min, max) {
    const range = max - min + BigInt(1);
    const bytes = 32;
    const buf = crypto.randomBytes(bytes);
    const randomBigInt = BigInt('0x' + buf.toString('hex'));
    return min + (randomBigInt % range);
  }

  /**
   * Miller-Rabin测试单次迭代
   */
  millerRabinTest(n, a, d, s) {
    n = this.toBigInt(n);
    a = this.toBigInt(a);
    d = this.toBigInt(d);

    let x = this.modPow(a, d, n);
    if (x === BigInt(1) || x === n - BigInt(1)) {
      return true;
    }

    for (let r = 1; r < s; r++) {
      x = this.modMul(x, x, n);
      if (x === n - BigInt(1)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 模幂运算 (a^e mod m)
   */
  modPow(base, exp, mod) {
    base = this.toBigInt(base);
    exp = this.toBigInt(exp);
    mod = this.toBigInt(mod);
    
    let result = BigInt(1);
    base = base % mod;
    
    while (exp > BigInt(0)) {
      if (exp % BigInt(2) === BigInt(1)) {
        result = (result * base) % mod;
      }
      exp = exp / BigInt(2);
      base = (base * base) % mod;
    }
    return result;
  }

  /**
   * 模乘运算
   */
  modMul(a, b, mod) {
    if (a === undefined || b === undefined || mod === undefined) {
      throw new Error('modMul received undefined value');
    }
    a = this.toBigInt(a);
    b = this.toBigInt(b);
    mod = this.toBigInt(mod);
    return (a * b) % mod;
  }

  /**
   * 模减运算
   */
  modSub(a, b, mod) {
    a = this.toBigInt(a);
    b = this.toBigInt(b);
    mod = this.toBigInt(mod);
    return ((a - b) % mod + mod) % mod;
  }

  /**
   * 计算最大公约数
   */
  gcd(a, b) {
    a = this.toBigInt(a);
    b = this.toBigInt(b);
    while (b !== BigInt(0)) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  /**
   * 扩展欧几里得算法
   */
  extendedGcd(a, b) {
    a = this.toBigInt(a);
    b = this.toBigInt(b);
    if (b === BigInt(0)) {
      return { gcd: a, x: BigInt(1), y: BigInt(0) };
    }
    const { gcd, x: x1, y: y1 } = this.extendedGcd(b, a % b);
    return {
      gcd,
      x: y1,
      y: x1 - (a / b) * y1
    };
  }

  /**
   * 计算模逆元
   */
  modInverse(a, n) {
    a = this.toBigInt(a);
    n = this.toBigInt(n);
    const { gcd, x } = this.extendedGcd(a, n);
    if (gcd !== BigInt(1)) {
      throw new Error('模逆元不存在');
    }
    return ((x % n) + n) % n;
  }

  /**
   * 生成密钥对
   */
  generateKeyPair() {
    const p = this.generatePrime(this.keySize / 2);
    const q = this.generatePrime(this.keySize / 2);
    const n = p * q;
    const lambda = (p - BigInt(1)) * (q - BigInt(1));
    const nSquared = n * n;
    const mu = this.modInverse(lambda, n);

    return {
      publicKey: { n, nSquared, g: n + BigInt(1) },
      privateKey: { lambda, mu, p, q }
    };
  }

  /**
   * 加密消息
   */
  encrypt(m, publicKey) {
    const n = this.toBigInt(publicKey.n);
    const nSquared = this.toBigInt(publicKey.nSquared);
    const g = this.toBigInt(publicKey.g);
    
    let message = this.toBigInt(m);
    if (message < BigInt(0)) {
      message = message + n;
    }
    if (message >= n) {
      throw new Error('消息值必须小于n');
    }

    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const r = this.generateRandomBigIntBetween(BigInt(2), n - BigInt(1));
      if (this.gcd(r, n) === BigInt(1)) {
        const c = this.modMul(
          this.modPow(g, message, nSquared),
          this.modPow(r, n, nSquared),
          nSquared
        );
        return c.toString();
      }
    }
    throw new Error('加密失败：无法找到合适的随机数');
  }

  /**
   * 解密消息
   */
  decrypt(c, publicKey, privateKey) {
    const n = this.toBigInt(publicKey.n);
    const nSquared = this.toBigInt(publicKey.nSquared);
    const lambda = this.toBigInt(privateKey.lambda);
    const mu = this.toBigInt(privateKey.mu);
    const ciphertext = this.toBigInt(c);

    const u = this.modPow(ciphertext, lambda, nSquared);
    const l = this.modMul(this.modSub(u, BigInt(1), nSquared) / n, mu, n);
    
    if (l >= n / BigInt(2)) {
      return Number(l - n);
    }
    return Number(l);
  }

  /**
   * 同态加法
   */
  add(c1, c2, publicKey) {
    const nSquared = this.toBigInt(publicKey.nSquared);
    const cipher1 = this.toBigInt(c1);
    const cipher2 = this.toBigInt(c2);
    return (cipher1 * cipher2 % nSquared).toString();
  }

  /**
   * 同态标量乘法
   */
  scalarMultiply(c, k, publicKey) {
    const nSquared = this.toBigInt(publicKey.nSquared);
    const ciphertext = this.toBigInt(c);
    const scalar = this.toBigInt(k);
    return this.modPow(ciphertext, scalar, nSquared).toString();
  }
}

class HomomorphicEncryptionService {
  constructor(config = {}) {
    this.keySize = config.keySize || 2048;
    this.paillier = new PaillierCryptosystem(this.keySize);
    this.publicKey = null;
    this.privateKey = null;
    this.keyPairId = null;
  }

  async generateKeyPair() {
    const keyPair = this.paillier.generateKeyPair();
    this.publicKey = keyPair.publicKey;
    this.privateKey = keyPair.privateKey;
    this.keyPairId = crypto.randomUUID();
    
    return {
      keyPairId: this.keyPairId,
      publicKey: {
        n: keyPair.publicKey.n.toString(),
        nSquared: keyPair.publicKey.nSquared.toString(),
        g: keyPair.publicKey.g.toString()
      },
      privateKey: {
        lambda: keyPair.privateKey.lambda.toString(),
        mu: keyPair.privateKey.mu.toString()
      },
      keySize: this.keySize
    };
  }

  loadKeyPair(publicKey, privateKey) {
    this.publicKey = {
      n: BigInt(publicKey.n),
      nSquared: BigInt(publicKey.nSquared),
      g: BigInt(publicKey.g)
    };
    this.privateKey = {
      lambda: BigInt(privateKey.lambda),
      mu: BigInt(privateKey.mu)
    };
  }

  encrypt(value) {
    if (!this.publicKey) {
      throw new Error('请先生成或加载密钥对');
    }
    const ciphertext = this.paillier.encrypt(value, this.publicKey);
    return { ciphertext, scheme: 'paillier', keyPairId: this.keyPairId };
  }

  encryptBatch(values) {
    return values.map(value => this.encrypt(value));
  }

  decrypt(encryptedData) {
    if (!this.privateKey || !this.publicKey) {
      throw new Error('请先生成或加载密钥对');
    }
    const ciphertext = typeof encryptedData === 'object' ? encryptedData.ciphertext : encryptedData;
    return this.paillier.decrypt(ciphertext, this.publicKey, this.privateKey);
  }

  decryptBatch(encryptedDataArray) {
    return encryptedDataArray.map(data => this.decrypt(data));
  }

  add(encrypted1, encrypted2) {
    if (!this.publicKey) {
      throw new Error('请先生成或加载密钥对');
    }
    const c1 = typeof encrypted1 === 'object' ? encrypted1.ciphertext : encrypted1;
    const c2 = typeof encrypted2 === 'object' ? encrypted2.ciphertext : encrypted2;
    const result = this.paillier.add(c1, c2, this.publicKey);
    return { ciphertext: result, scheme: 'paillier', keyPairId: this.keyPairId };
  }

  multiplyScalar(encrypted, scalar) {
    if (!this.publicKey) {
      throw new Error('请先生成或加载密钥对');
    }
    const c = typeof encrypted === 'object' ? encrypted.ciphertext : encrypted;
    const result = this.paillier.scalarMultiply(c, scalar, this.publicKey);
    return { ciphertext: result, scheme: 'paillier', keyPairId: this.keyPairId };
  }

  secureSum(encryptedValues) {
    if (encryptedValues.length === 0) {
      throw new Error('输入值数组不能为空');
    }
    let result = encryptedValues[0];
    for (let i = 1; i < encryptedValues.length; i++) {
      result = this.add(result, encryptedValues[i]);
    }
    return result;
  }

  secureAverage(encryptedValues) {
    const sum = this.secureSum(encryptedValues);
    return this.multiplyScalar(sum, 1 / encryptedValues.length);
  }

  getPublicKeyInfo() {
    if (!this.publicKey) return null;
    return {
      n: this.publicKey.n.toString(),
      nSquared: this.publicKey.nSquared.toString(),
      g: this.publicKey.g.toString(),
      keySize: this.keySize
    };
  }

  validateKeyPair() {
    if (!this.publicKey || !this.privateKey) {
      return { valid: false, reason: '密钥对未初始化' };
    }
    try {
      const testValue = 42;
      const encrypted = this.encrypt(testValue);
      const decrypted = this.decrypt(encrypted);
      return { valid: decrypted === testValue };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  getStatus() {
    return {
      initialized: this.publicKey !== null,
      keySize: this.keySize,
      scheme: 'paillier',
      keyPairId: this.keyPairId,
      capabilities: [
        'additive-homomorphic-encryption',
        'scalar-multiplication',
        'batch-encryption',
        'secure-sum',
        'secure-average'
      ]
    };
  }
}

module.exports = {
  HomomorphicEncryptionService,
  PaillierCryptosystem
};

if (require.main === module) {
  console.log('=== 同态加密服务示例 ===\n');
  
  const heService = new HomomorphicEncryptionService({ keySize: 512 });
  
  heService.generateKeyPair().then(keys => {
    console.log('1. 密钥生成完成');
    console.log(`   密钥对ID: ${keys.keyPairId}`);
    console.log(`   密钥长度: ${keys.keySize} bits\n`);
    
    console.log('2. 测试加密解密...');
    const originalValue = 100;
    const encrypted = heService.encrypt(originalValue);
    const decrypted = heService.decrypt(encrypted);
    console.log(`   原值: ${originalValue}, 解密后: ${decrypted}`);
    console.log(`   验证: ${originalValue === decrypted ? '✓ 通过' : '✗ 失败'}\n`);
    
    console.log('3. 测试同态加法...');
    const encrypted1 = heService.encrypt(10);
    const encrypted2 = heService.encrypt(20);
    const sumEncrypted = heService.add(encrypted1, encrypted2);
    const sum = heService.decrypt(sumEncrypted);
    console.log(`   10 + 20 = ${sum}`);
    console.log(`   验证: ${sum === 30 ? '✓ 通过' : '✗ 失败'}\n`);
    
    console.log('4. 测试标量乘法...');
    const scaled = heService.multiplyScalar(heService.encrypt(15), 3);
    const result = heService.decrypt(scaled);
    console.log(`   15 * 3 = ${result}`);
    console.log(`   验证: ${result === 45 ? '✓ 通过' : '✗ 失败'}\n`);
    
    console.log('5. 测试安全求和...');
    const secureValues = [100, 200, 300, 400, 500];
    const encryptedValues = heService.encryptBatch(secureValues);
    const encryptedSum = heService.secureSum(encryptedValues);
    const sumResult = heService.decrypt(encryptedSum);
    console.log(`   求和结果: ${sumResult}`);
    console.log(`   期望: ${secureValues.reduce((a, b) => a + b, 0)}`);
    console.log(`   验证: ${sumResult === secureValues.reduce((a, b) => a + b, 0) ? '✓ 通过' : '✗ 失败'}\n`);
    
    console.log('6. 密钥验证...');
    const validation = heService.validateKeyPair();
    console.log(`   密钥有效性: ${validation.valid ? '✓ 有效' : '✗ 无效'}\n`);
    
    console.log('=== 所有测试完成 ===');
  }).catch(error => {
    console.error('测试失败:', error);
  });
}

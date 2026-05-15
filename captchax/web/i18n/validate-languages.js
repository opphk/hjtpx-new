const fs = require('fs');
const path = require('path');

const i18nDir = __dirname;

// 基准语言文件
const baseLangFile = path.join(i18nDir, 'en.json');

// 预期支持的所有语言代码
const expectedLocales = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'ar', 'de', 'es', 'fr', 'ru', 'it', 'nl'];

console.log('=== CaptchaX 语言文件验证 ===\n');

// 1. 加载基准语言文件
let baseLang;
try {
  baseLang = JSON.parse(fs.readFileSync(baseLangFile, 'utf8'));
  console.log('✅ 基准语言文件 (en.json) 加载成功');
} catch (e) {
  console.error('❌ 基准语言文件加载失败:', e.message);
  process.exit(1);
}

// 2. 检查所有语言文件是否存在
const existingFiles = fs.readdirSync(i18nDir)
  .filter(file => file.endsWith('.json') && file !== 'package.json');

console.log(`\n📄 找到 ${existingFiles.length} 个语言文件`);

const localeFiles = existingFiles.map(file => {
  const locale = path.basename(file, '.json');
  return { file, locale, path: path.join(i18nDir, file) };
});

// 检查是否所有预期的语言文件都存在
const missingLocales = expectedLocales.filter(locale => 
  !localeFiles.some(lf => lf.locale === locale)
);

if (missingLocales.length > 0) {
  console.log('❌ 缺失语言文件:', missingLocales);
} else {
  console.log('✅ 所有预期的语言文件都存在');
}

// 检查是否有额外的语言文件
const extraLocales = localeFiles.filter(lf => !expectedLocales.includes(lf.locale));
if (extraLocales.length > 0) {
  console.log('⚠️  额外的语言文件:', extraLocales.map(lf => lf.locale));
}

// 3. 检查每个语言文件的结构和完整性
console.log('\n🔍 验证语言文件完整性:');

const getAllKeys = (obj, prefix = '') => {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
};

const baseKeys = getAllKeys(baseLang);

let allValid = true;

for (const lf of localeFiles) {
  try {
    const content = JSON.parse(fs.readFileSync(lf.path, 'utf8'));
    const keys = getAllKeys(content);
    
    // 检查必填字段
    const requiredFields = ['code', 'name', 'dir'];
    const missingFields = requiredFields.filter(field => !content[field]);
    
    // 检查是否缺少翻译键
    const missingKeys = baseKeys.filter(key => !keys.includes(key));
    
    // 检查是否有多余的键
    const extraKeys = keys.filter(key => !baseKeys.includes(key));
    
    console.log(`\n${lf.locale} (${lf.file}):`);
    
    if (missingFields.length > 0) {
      console.log(`  ❌ 缺失必填字段: ${missingFields}`);
      allValid = false;
    } else {
      console.log(`  ✅ 必填字段完整 (code: "${content.code}", name: "${content.name}", dir: "${content.dir}")`);
    }
    
    if (missingKeys.length > 0) {
      console.log(`  ❌ 缺失翻译键 (${missingKeys.length}):`, missingKeys.slice(0, 5));
      if (missingKeys.length > 5) console.log(`     ... 还有 ${missingKeys.length - 5} 个`);
      allValid = false;
    } else {
      console.log(`  ✅ 所有翻译键完整 (${keys.length} 个)`);
    }
    
    if (extraKeys.length > 0) {
      console.log(`  ⚠️  额外翻译键 (${extraKeys.length}):`, extraKeys.slice(0, 5));
      if (extraKeys.length > 5) console.log(`     ... 还有 ${extraKeys.length - 5} 个`);
    }
    
  } catch (e) {
    console.log(`  ❌ ${lf.file} 解析失败:`, e.message);
    allValid = false;
  }
}

console.log('\n' + '='.repeat(40));
if (allValid) {
  console.log('🎉 所有语言文件验证通过！');
  console.log('支持的语言:', expectedLocales.join(', '));
  process.exit(0);
} else {
  console.log('❌ 部分语言文件有问题，请检查！');
  process.exit(1);
}

#!/usr/bin/env node

/**
 * 数据库索引维护脚本
 * 
 * 功能：
 * - 分析索引使用情况
 * - 识别未使用的索引
 * - 分析索引膨胀
 * - 生成优化建议
 * - 执行索引重建
 * 
 * 使用方法：
 *   node index-maintenance.js [options]
 * 
 * 选项：
 *   --analyze      分析索引使用情况（默认）
 *   --unused       列出未使用的索引
 *   --bloat        分析索引膨胀
 *   --rebuild      重建指定索引
 *   --rebuild-all  重建所有索引
 *   --recommend    生成索引建议
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hjtpx',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
};

const SCHEMA = process.env.DB_SCHEMA || 'public';
const REPORT_DIR = path.join(__dirname, '..', 'logs');

let pool;

async function initializeDatabase() {
    pool = new Pool(DB_CONFIG);
    
    try {
        const client = await pool.connect();
        client.release();
        console.log('✅ 数据库连接成功');
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        process.exit(1);
    }
}

async function analyzeIndexes() {
    console.log('\n📊 开始分析索引使用情况...\n');
    
    const query = `
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan as scan_count,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            pg_relation_size(indexrelid) as index_size_bytes
        FROM pg_stat_user_indexes
        JOIN pg_index USING (indexrelid)
        WHERE schemaname = $1
        ORDER BY idx_scan DESC, tablename
    `;
    
    const result = await pool.query(query, [SCHEMA]);
    const indexes = result.rows;
    
    console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│                              索引使用情况分析                                   │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────┤');
    console.log('│ 表名            │ 索引名                 │ 扫描次数 │ 大小    │ 状态        │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────┤');
    
    indexes.forEach(idx => {
        const status = idx.scan_count === 0 ? '❌ 未使用' : 
                     idx.scan_count < 10 ? '⚠️  低使用' : '✅ 正常';
        const tableName = idx.tablename.padEnd(15).slice(0, 15);
        const indexName = idx.indexname.padEnd(22).slice(0, 22);
        
        console.log(`│ ${tableName} │ ${indexName} │ ${String(idx.scan_count).padStart(8)} │ ${idx.index_size.padStart(7)} │ ${status} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────┘');
    
    return indexes;
}

async function findUnusedIndexes() {
    console.log('\n🔍 查找未使用的索引...\n');
    
    const query = `
        SELECT 
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            pg_relation_size(indexrelid) as size_bytes,
            idx_scan
        FROM pg_stat_user_indexes
        JOIN pg_index USING (indexrelid)
        WHERE schemaname = $1
          AND idx_scan = 0
          AND indexname NOT LIKE '%_pkey'
          AND indexname NOT LIKE '%_seq_%'
        ORDER BY pg_relation_size(indexrelid) DESC
    `;
    
    const result = await pool.query(query, [SCHEMA]);
    const unusedIndexes = result.rows;
    
    if (unusedIndexes.length === 0) {
        console.log('✅ 所有索引都在使用中！');
        return [];
    }
    
    console.log(`⚠️  发现 ${unusedIndexes.length} 个未使用的索引：\n`);
    
    console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 表名            │ 索引名                           │ 大小    │ 建议操作   │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────┤');
    
    unusedIndexes.forEach(idx => {
        const tableName = idx.tablename.padEnd(15).slice(0, 15);
        const indexName = idx.indexname.padEnd(30).slice(0, 30);
        const action = idx.size_bytes > 1024 * 1024 ? '🗑️  删除' : '📋 评估';
        
        console.log(`│ ${tableName} │ ${indexName} │ ${idx.index_size.padStart(7)} │ ${action} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────┘');
    
    return unusedIndexes;
}

async function analyzeIndexBloat() {
    console.log('\n📈 分析索引膨胀...\n');
    
    const query = `
        SELECT 
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) as current_size,
            pg_size_pretty(pg_relation_size(relid)) as table_size,
            ROUND(
                (pg_relation_size(indexrelid)::numeric / 
                NULLIF(pg_relation_size(relid), 0)) * 100, 
                2
            ) as bloat_ratio,
            n_dead_tup,
            n_live_tup
        FROM pg_stat_user_tables
        JOIN pg_index ON indexrelid = (schemaname || '.' || indexname)::regclass
        WHERE schemaname = $1
          AND n_dead_tup > 100
        ORDER BY n_dead_tup DESC
    `;
    
    try {
        const result = await pool.query(query, [SCHEMA]);
        const bloatedIndexes = result.rows;
        
        if (bloatedIndexes.length === 0) {
            console.log('✅ 索引状态良好，无明显膨胀！');
            return [];
        }
        
        console.log('⚠️  以下索引存在膨胀，建议重建：\n');
        
        console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
        console.log('│ 表名            │ 索引名                 │ 死元组  │ 膨胀比例 │ 建议       │');
        console.log('├─────────────────────────────────────────────────────────────────────────────────┤');
        
        bloatedIndexes.forEach(idx => {
            const tableName = idx.tablename.padEnd(15).slice(0, 15);
            const indexName = idx.indexname.padEnd(22).slice(0, 22);
            const bloatRatio = parseFloat(idx.bloat_ratio || 0);
            const action = bloatRatio > 50 ? '🔨 重建' : 
                          bloatRatio > 20 ? '📋 监控' : '✅ 正常';
            
            console.log(`│ ${tableName} │ ${indexName} │ ${String(idx.n_dead_tup).padStart(6)} │ ${String(bloatRatio).padStart(7)}% │ ${action} │`);
        });
        
        console.log('└─────────────────────────────────────────────────────────────────────────────────┘');
        
        return bloatedIndexes;
    } catch (error) {
        console.log('ℹ️  无法获取膨胀数据（可能需要更详细的权限）');
        return [];
    }
}

async function rebuildIndex(indexName) {
    console.log(`\n🔨 正在重建索引: ${indexName}...\n`);
    
    const query = `
        REINDEX INDEX CONCURRENTLY ${indexName}
    `;
    
    const startTime = Date.now();
    
    try {
        await pool.query(query);
        const duration = Date.now() - startTime;
        console.log(`✅ 索引 ${indexName} 重建完成，耗时: ${duration}ms`);
    } catch (error) {
        console.error(`❌ 重建索引失败: ${error.message}`);
        throw error;
    }
}

async function rebuildAllIndexes() {
    console.log('\n🔨 正在重建所有用户表索引...\n');
    
    const query = `
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = $1
          AND indexname NOT LIKE '%_pkey'
    `;
    
    const result = await pool.query(query, [SCHEMA]);
    const indexes = result.rows;
    
    console.log(`发现 ${indexes.length} 个索引需要重建\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const idx of indexes) {
        const fullName = `${idx.tablename}.${idx.indexname}`;
        try {
            await rebuildIndex(fullName);
            successCount++;
        } catch (error) {
            failCount++;
            console.log(`⚠️  跳过索引: ${fullName}`);
        }
    }
    
    console.log(`\n📊 重建完成: 成功 ${successCount}, 失败 ${failCount}`);
}

async function generateRecommendations() {
    console.log('\n💡 生成索引优化建议...\n');
    
    const indexes = await analyzeIndexes();
    const unusedIndexes = await findUnusedIndexes();
    
    let report = '# 索引优化建议报告\n\n';
    report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    
    report += '## 概览\n\n';
    report += `- 总索引数: ${indexes.length}\n`;
    report += `- 使用中的索引: ${indexes.filter(i => i.scan_count > 0).length}\n`;
    report += `- 未使用的索引: ${unusedIndexes.length}\n\n`;
    
    report += '## 建议操作\n\n';
    
    if (unusedIndexes.length > 0) {
        report += '### 1. 删除未使用的索引\n\n';
        report += '```sql\n';
        unusedIndexes.forEach(idx => {
            report += `-- ${idx.tablename}.${idx.indexname} (${idx.index_size})\n`;
            report += `DROP INDEX IF EXISTS ${idx.tablename}.${idx.indexname};\n`;
        });
        report += '```\n\n';
        
        const totalSize = unusedIndexes.reduce((sum, idx) => sum + parseInt(idx.size_bytes), 0);
        const totalSizePretty = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
        report += `**预计节省空间**: ${totalSizePretty}\n\n`;
    }
    
    const lowUsage = indexes.filter(i => i.scan_count > 0 && i.scan_count < 10);
    if (lowUsage.length > 0) {
        report += '### 2. 评估低使用率索引\n\n';
        report += '以下索引使用频率较低，请评估是否必要：\n\n';
        report += '| 表名 | 索引名 | 扫描次数 | 建议 |\n';
        report += '|------|--------|---------|------|\n';
        lowUsage.forEach(idx => {
            report += `| ${idx.tablename} | ${idx.indexname} | ${idx.scan_count} | 评估是否需要 |\n`;
        });
        report += '\n';
    }
    
    report += '### 3. 定期维护建议\n\n';
    report += '- 每周运行 `ANALYZE` 更新统计信息\n';
    report += '- 每月检查索引使用情况\n';
    report += '- 每季度重建高膨胀率索引\n';
    report += '- 监控慢查询并针对性创建索引\n\n';
    
    const reportPath = path.join(REPORT_DIR, `index-recommendations-${Date.now()}.md`);
    
    try {
        await fs.mkdir(REPORT_DIR, { recursive: true });
        await fs.writeFile(reportPath, report, 'utf8');
        console.log(`✅ 优化建议报告已保存: ${reportPath}`);
    } catch (error) {
        console.log('⚠️  无法保存报告到文件');
    }
    
    return report;
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || '--analyze';
    
    console.log('🗄️  数据库索引维护工具\n');
    console.log(`📦 数据库: ${DB_CONFIG.database}@${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`🔧 Schema: ${SCHEMA}\n`);
    
    await initializeDatabase();
    
    try {
        switch (command) {
            case '--analyze':
            case '-a':
                await analyzeIndexes();
                await analyzeIndexBloat();
                break;
                
            case '--unused':
            case '-u':
                await findUnusedIndexes();
                break;
                
            case '--bloat':
            case '-b':
                await analyzeIndexBloat();
                break;
                
            case '--rebuild':
            case '-r':
                const indexName = args[1];
                if (!indexName) {
                    console.error('❌ 请指定要重建的索引名');
                    console.log('用法: node index-maintenance.js --rebuild <schema.index_name>');
                    process.exit(1);
                }
                await rebuildIndex(indexName);
                break;
                
            case '--rebuild-all':
            case '-R':
                await rebuildAllIndexes();
                break;
                
            case '--recommend':
            case '-c':
                await generateRecommendations();
                break;
                
            case '--help':
            case '-h':
                console.log('使用说明:');
                console.log('  node index-maintenance.js [options]');
                console.log('');
                console.log('选项:');
                console.log('  --analyze, -a      分析索引使用情况（默认）');
                console.log('  --unused, -u       列出未使用的索引');
                console.log('  --bloat, -b       分析索引膨胀');
                console.log('  --rebuild, -r     重建指定索引');
                console.log('  --rebuild-all, -R 重建所有索引');
                console.log('  --recommend, -c   生成优化建议');
                console.log('  --help, -h        显示帮助信息');
                break;
                
            default:
                console.error(`❌ 未知命令: ${command}`);
                console.log('使用 --help 查看可用选项');
                process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ 执行失败:', error.message);
        process.exit(1);
    }
    
    await pool.end();
    console.log('\n✅ 数据库连接已关闭');
}

process.on('SIGINT', async () => {
    console.log('\n\n⚠️  正在取消操作...');
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

main().catch(console.error);

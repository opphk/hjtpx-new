#!/usr/bin/env node

/**
 * 数据库文档自动生成脚本
 * 
 * 功能：
 * - 从数据库读取表结构信息
 * - 生成 Markdown 格式的数据字典
 * - 生成 ER 图
 * - 生成索引分析报告
 * - 支持增量更新
 * 
 * 使用方法：
 *   node generate-db-docs.js [options]
 * 
 * 选项：
 *   --all       生成完整文档
 *   --tables    仅生成表结构
 *   --indexes   仅生成索引分析
 *   --er        仅生成 ER 图
 *   --diff      仅显示变更
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

const momentLocales = require('moment/locale/zh-cn');
moment.locale('zh-cn');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hjtpx',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
};

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'database');
const SCHEMA = process.env.DB_SCHEMA || 'public';

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

async function getTables() {
    const query = `
        SELECT 
            t.table_name,
            t.table_type,
            obj_description((t.table_schema || '.' || t.table_name)::regclass, 'pg_class') as description
        FROM information_schema.tables t
        LEFT JOIN pg_tables pt ON pt.schemaname = t.table_schema AND pt.tablename = t.table_name
        WHERE t.table_schema = $1
          AND t.table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY t.table_name
    `;
    
    const result = await pool.query(query, [SCHEMA]);
    return result.rows;
}

async function getTableColumns(tableName) {
    const query = `
        SELECT 
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.is_nullable,
            c.column_default,
            c.udt_name,
            col_description((c.table_schema || '.' || c.table_name)::regclass, c.ordinal_position) as description,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku 
                ON tc.constraint_name = ku.constraint_name
                AND tc.table_schema = ku.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_schema = $1
          AND c.table_name = $2
        ORDER BY c.ordinal_position
    `;
    
    const result = await pool.query(query, [SCHEMA, tableName]);
    return result.rows;
}

async function getTableIndexes(tableName) {
    const query = `
        SELECT 
            i.relname as index_name,
            a.attname as column_name,
            ix.indisunique as is_unique,
            ix.indisprimary as is_primary,
            ix.indisclustered as is_clustered,
            CASE ix.indoption[a.attnum - 1]
                WHEN 0 THEN 'ASC'
                ELSE 'DESC'
            END as order,
            pg_get_expr(ix.indpred, ix.indrelid) as predicate,
            pg_size_pretty(pg_relation_size(i.oid)) as index_size
        FROM pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
          AND n.nspname = $1
          AND t.relname = $2
          AND NOT i.relname LIKE '%_pkey'
        ORDER BY i.relname, a.attnum
    `;
    
    const result = await pool.query(query, [SCHEMA, tableName]);
    return result.rows;
}

async function getTableForeignKeys(tableName) {
    const query = `
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY tc.constraint_name, kcu.ordinal_position
    `;
    
    const result = await pool.query(query, [SCHEMA, tableName]);
    return result.rows;
}

async function getTableConstraints(tableName) {
    const query = `
        SELECT 
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            pg_get_constraintdef(tc.oid) as constraint_def
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = $1
          AND tc.table_name = $2
          AND tc.constraint_type IN ('UNIQUE', 'CHECK')
        ORDER BY tc.constraint_name, kcu.ordinal_position
    `;
    
    const result = await pool.query(query, [SCHEMA, tableName]);
    return result.rows;
}

async function getIndexesStats() {
    const query = `
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE schemaname = $1
        ORDER BY idx_scan ASC, tablename
    `;
    
    const result = await pool.query(query, [SCHEMA]);
    return result.rows;
}

async function getTableStats() {
    const query = `
        SELECT 
            schemaname,
            relname as table_name,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_tuples,
            n_dead_tup as dead_tuples,
            pg_size_pretty(pg_total_relation_size(relid)) as table_size,
            last_vacuum,
            last_autovacuum,
            last_analyze,
            last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname = $1
        ORDER BY relname
    `;
    
    const result = await pool.query(query, [SCHEMA]);
    return result.rows;
}

function generateColumnType(column) {
    let type = column.data_type.toUpperCase();
    
    if (column.data_type === 'character varying') {
        type = `VARCHAR(${column.character_maximum_length || 255})`;
    } else if (column.data_type === 'character') {
        type = `CHAR(${column.character_maximum_length || 1})`;
    } else if (column.data_type === 'numeric') {
        type = `DECIMAL(${column.numeric_precision}, ${column.numeric_scale || 0})`;
    } else if (column.udt_name.startsWith('_')) {
        type = `${column.udt_name.slice(1).toUpperCase()}[]`;
    } else if (column.data_type === 'ARRAY') {
        type = column.udt_name.replace('_', '') + '[]';
    }
    
    return type;
}

function generateTableDocumentation(tableName, columns, indexes, foreignKeys, constraints, description) {
    let md = `### ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}\n\n`;
    
    if (description) {
        md += `**描述**：${description}\n\n`;
    }
    
    md += `**主键**：${columns.find(c => c.is_primary_key)?.column_name || '无'}\n\n`;
    
    if (foreignKeys.length > 0) {
        md += `**外键**：\n`;
        foreignKeys.forEach(fk => {
            const deleteRule = fk.delete_rule === 'CASCADE' ? 'ON DELETE CASCADE' : 
                              fk.delete_rule === 'SET NULL' ? 'ON DELETE SET NULL' : 
                              fk.delete_rule === 'RESTRICT' ? 'ON DELETE RESTRICT' : '';
            md += `- \`${fk.column_name}\` → \`${fk.foreign_table_name}(${fk.foreign_column_name})\` ${deleteRule}\n`;
        });
        md += '\n';
    }
    
    if (indexes.length > 0) {
        md += `**索引**：\n`;
        indexes.forEach(idx => {
            const indexType = idx.is_primary ? '主键索引' : 
                             idx.is_unique ? '唯一索引' : '普通索引';
            const predicate = idx.predicate ? ` WHERE ${idx.predicate}` : '';
            md += `- \`${idx.index_name}\` (${idx.column_name}) ${predicate}\n`;
        });
        md += '\n';
    }
    
    md += `| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |\n`;
    md += `|--------|----------|------|--------|------|\n`;
    
    columns.forEach(col => {
        const type = generateColumnType(col);
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const pk = col.is_primary_key ? 'PRIMARY KEY' : '';
        const constraints = [pk, nullable].filter(c => c).join(', ');
        const defaultValue = col.column_default || '-';
        const description = col.description || '-';
        
        md += `| ${col.column_name} | ${type} | ${constraints} | ${defaultValue} | ${description} |\n`;
    });
    
    md += '\n---\n\n';
    
    return md;
}

async function generateFullSchema() {
    console.log('📝 开始生成完整数据库文档...\n');
    
    const tables = await getTables();
    let schema = `# 数据库设计文档\n\n`;
    schema += `## 概述\n\n`;
    schema += `本文档由脚本自动生成，最后更新时间：${moment().format('YYYY-MM-DD HH:mm:ss')}\n\n`;
    
    schema += `## 数据库信息\n\n`;
    schema += `| 属性 | 值 |\n`;
    schema += `|------|-----|\n`;
    schema += `| 数据库类型 | PostgreSQL |\n`;
    schema += `| Schema | ${SCHEMA} |\n`;
    schema += `| 生成时间 | ${moment().format('YYYY-MM-DD HH:mm:ss')} |\n\n`;
    
    schema += `---\n\n`;
    schema += `## 数据字典\n\n`;
    
    for (const table of tables) {
        console.log(`  处理表: ${table.table_name}`);
        
        const columns = await getTableColumns(table.table_name);
        const indexes = await getTableIndexes(table.table_name);
        const foreignKeys = await getTableForeignKeys(table.table_name);
        const constraints = await getTableConstraints(table.table_name);
        
        schema += generateTableDocumentation(
            table.table_name,
            columns,
            indexes,
            foreignKeys,
            constraints,
            table.description
        );
    }
    
    const schemaPath = path.join(OUTPUT_DIR, 'schema.md');
    await fs.writeFile(schemaPath, schema, 'utf8');
    console.log(`\n✅ 文档已生成: ${schemaPath}`);
    
    return schemaPath;
}

async function generateIndexAnalysis() {
    console.log('📊 开始生成索引分析报告...\n');
    
    const indexes = await getIndexesStats();
    const tableStats = await getTableStats();
    
    let report = `# 数据库索引分析报告\n\n`;
    report += `生成时间：${moment().format('YYYY-MM-DD HH:mm:ss')}\n\n`;
    
    report += `## 索引使用统计\n\n`;
    report += `| Schema | 表名 | 索引名 | 扫描次数 | 读取行数 | 获取行数 | 索引大小 |\n`;
    report += `|--------|------|--------|----------|---------|---------|----------|\n`;
    
    indexes.forEach(idx => {
        report += `| ${idx.schemaname} | ${idx.tablename} | ${idx.indexname} | ${idx.idx_scan} | ${idx.idx_tup_read} | ${idx.idx_tup_fetch} | ${idx.index_size} |\n`;
    });
    
    report += `\n## 表统计\n\n`;
    report += `| 表名 | 插入 | 更新 | 删除 | 活跃行数 | 死元组 | 表大小 | 最后Vacuum | 最后Analyze |\n`;
    report += `|------|------|------|------|---------|--------|--------|-----------|------------|\n`;
    
    tableStats.forEach(stat => {
        const lastVacuum = stat.last_vacuum ? moment(stat.last_vacuum).format('YYYY-MM-DD HH:mm') : '从未';
        const lastAnalyze = stat.last_analyze ? moment(stat.last_analyze).format('YYYY-MM-DD HH:mm') : '从未';
        report += `| ${stat.table_name} | ${stat.inserts} | ${stat.updates} | ${stat.deletes} | ${stat.live_tuples} | ${stat.dead_tuples} | ${stat.table_size} | ${lastVacuum} | ${lastAnalyze} |\n`;
    });
    
    report += `\n## 未使用索引\n\n`;
    const unusedIndexes = indexes.filter(idx => idx.idx_scan === 0);
    if (unusedIndexes.length > 0) {
        report += `以下索引从未被使用，建议删除：\n\n`;
        report += `| 索引名 | 表名 | 大小 |\n`;
        report += `|--------|------|------|\n`;
        unusedIndexes.forEach(idx => {
            report += `| ${idx.indexname} | ${idx.tablename} | ${idx.index_size} |\n`;
        });
    } else {
        report += `✅ 所有索引都在使用中。\n`;
    }
    
    const reportPath = path.join(OUTPUT_DIR, 'index-analysis.md');
    await fs.writeFile(reportPath, report, 'utf8');
    console.log(`✅ 索引分析报告已生成: ${reportPath}`);
    
    return reportPath;
}

async function generateERDiagram() {
    console.log('🔗 开始生成 ER 图...\n');
    
    const tables = await getTables();
    let er = `# ER 图\n\n`;
    er += `> 生成时间：${moment().format('YYYY-MM-DD HH:mm:ss')}\n\n`;
    
    er += `## 关系图\n\n`;
    er += '```\n';
    
    const tableInfo = {};
    for (const table of tables) {
        const columns = await getTableColumns(table.table_name);
        const foreignKeys = await getTableForeignKeys(table.table_name);
        tableInfo[table.table_name] = { columns, foreignKeys };
    }
    
    tables.forEach(table => {
        const { columns, foreignKeys } = tableInfo[table.table_name];
        
        er += `┌──────────────────────────────────────┐\n`;
        er += `│ ${table.table_name.padEnd(38)} │\n`;
        er += `├──────────────────────────────────────┤\n`;
        
        columns.slice(0, 6).forEach(col => {
            const type = col.data_type === 'uuid' ? 'UUID' : 
                        col.data_type === 'timestamp' ? 'TS' : 
                        col.data_type === 'boolean' ? 'BOOL' : 
                        col.data_type === 'text' ? 'TEXT' : 
                        col.data_type.includes('int') ? 'INT' : 'VARCHAR';
            const pk = col.is_primary_key ? '(PK)' : '';
            er += `│ ${col.column_name.padEnd(20)} ${type.padEnd(10)} ${pk.padEnd(8)} │\n`;
        });
        
        if (columns.length > 6) {
            er += `│ ... (共 ${columns.length} 个字段)              │\n`;
        }
        
        er += `└──────────────────────────────────────┘\n`;
        
        foreignKeys.forEach(fk => {
            er += `         │ ${fk.delete_rule.toLowerCase()}\n`;
            er += `         ▼\n`;
            er += `    ┌──────────────────────────────────────┐\n`;
            er += `    │ ${fk.foreign_table_name.padEnd(38)} │\n`;
            er += `    └──────────────────────────────────────┘\n`;
        });
        
        er += '\n';
    });
    
    er += '```\n\n';
    
    er += `## 表关系\n\n`;
    er += `| 源表 | 目标表 | 关系类型 | 删除规则 |\n`;
    er += `|------|--------|---------|----------|\n`;
    
    const relations = new Set();
    tables.forEach(table => {
        const { foreignKeys } = tableInfo[table.table_name];
        foreignKeys.forEach(fk => {
            const rel = {
                source: table.table_name,
                target: fk.foreign_table_name,
                cols: `${fk.column_name} → ${fk.foreign_column_name}`,
                deleteRule: fk.delete_rule
            };
            relations.add(rel);
        });
    });
    
    relations.forEach(rel => {
        er += `| ${rel.source} | ${rel.target} | ${rel.cols} | ${rel.deleteRule} |\n`;
    });
    
    const erPath = path.join(OUTPUT_DIR, 'er-diagram.md');
    await fs.writeFile(erPath, er, 'utf8');
    console.log(`✅ ER 图已生成: ${erPath}`);
    
    return erPath;
}

async function generateSummary() {
    console.log('📋 开始生成数据库摘要...\n');
    
    const tables = await getTables();
    let summary = `# 数据库摘要\n\n`;
    summary += `生成时间：${moment().format('YYYY-MM-DD HH:mm:ss')}\n\n`;
    
    summary += `## 统计信息\n\n`;
    summary += `| 指标 | 值 |\n`;
    summary += `|------|---|\n`;
    summary += `| 表数量 | ${tables.length} |\n`;
    
    let totalColumns = 0;
    let totalIndexes = 0;
    
    for (const table of tables) {
        const columns = await getTableColumns(table.table_name);
        const indexes = await getTableIndexes(table.table_name);
        totalColumns += columns.length;
        totalIndexes += indexes.length;
    }
    
    summary += `| 总字段数 | ${totalColumns} |\n`;
    summary += `| 总索引数 | ${totalIndexes} |\n`;
    summary += `| 平均每表字段数 | ${(totalColumns / tables.length).toFixed(1)} |\n`;
    summary += `| 平均每表索引数 | ${(totalIndexes / tables.length).toFixed(1)} |\n\n`;
    
    summary += `## 表列表\n\n`;
    summary += `| 表名 | 类型 | 字段数 | 索引数 | 描述 |\n`;
    summary += `|------|------|--------|--------|------|\n`;
    
    for (const table of tables) {
        const columns = await getTableColumns(table.table_name);
        const indexes = await getTableIndexes(table.table_name);
        summary += `| ${table.table_name} | ${table.table_type} | ${columns.length} | ${indexes.length} | ${table.description || '-'} |\n`;
    }
    
    const summaryPath = path.join(OUTPUT_DIR, 'summary.md');
    await fs.writeFile(summaryPath, summary, 'utf8');
    console.log(`✅ 摘要已生成: ${summaryPath}`);
    
    return summaryPath;
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || '--all';
    
    console.log('🗄️  数据库文档自动生成工具\n');
    console.log(`📦 数据库: ${DB_CONFIG.database}@${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`📂 输出目录: ${OUTPUT_DIR}\n`);
    
    await initializeDatabase();
    
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
    
    switch (command) {
        case '--tables':
        case '-t':
            await generateFullSchema();
            break;
            
        case '--indexes':
        case '-i':
            await generateIndexAnalysis();
            break;
            
        case '--er':
            await generateERDiagram();
            break;
            
        case '--summary':
        case '-s':
            await generateSummary();
            break;
            
        case '--all':
        default:
            await generateFullSchema();
            await generateIndexAnalysis();
            await generateERDiagram();
            await generateSummary();
            console.log('\n🎉 所有文档生成完成！');
            break;
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

process.on('unhandledRejection', (error) => {
    console.error('\n❌ 未处理的错误:', error);
    process.exit(1);
});

main().catch(console.error);

module.exports = {
    generateFullSchema,
    generateIndexAnalysis,
    generateERDiagram,
    generateSummary
};

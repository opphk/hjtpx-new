const db = require('../../config/database/db');

class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.maxCacheSize = 100;
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 100;
  }

  cacheKey(query, params) {
    return `${query}:${JSON.stringify(params || [])}`;
  }

  async cachedQuery(query, params, ttl = 60) {
    const key = this.cacheKey(query, params);
    
    const cachedResult = this.queryCache.get(key);
    if (cachedResult && Date.now() - cachedResult.timestamp < ttl * 1000) {
      return cachedResult.data;
    }

    const start = Date.now();
    const result = await db.query(query, params);
    const duration = Date.now() - start;

    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected (${duration}ms): ${query}`);
    }

    if (this.queryCache.size >= this.maxCacheSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(key, {
      data: result.rows,
      timestamp: Date.now()
    });

    return result.rows;
  }

  async batchQuery(queries) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      const results = await Promise.all(
        queries.map(async ({ query, params }) => {
          const result = await client.query(query, params);
          return result.rows;
        })
      );

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async batchInsert(table, rows, batchSize = 100) {
    if (rows.length === 0) return [];

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const returning = 'RETURNING *';

    const allResults = [];
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = batch.flatMap(row => columns.map(col => row[col]));
      
      const paramOffset = i * columns.length;
      const batchPlaceholders = batch.map((_, rowIndex) => {
        return `(${columns.map((_, colIndex) => 
          `$${paramOffset + rowIndex * columns.length + colIndex + 1}`
        ).join(', ')})`;
      }).join(', ');

      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${batchPlaceholders}
        ${returning}
      `;

      const result = await db.query(query, values);
      allResults.push(...result.rows);
    }

    return allResults;
  }

  async batchUpdate(table, updates, idColumn = 'id', batchSize = 100) {
    if (updates.length === 0) return [];

    const allResults = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const client = await db.getClient();
      
      try {
        await client.query('BEGIN');
        
        for (const update of batch) {
          const id = update[idColumn];
          const updateData = { ...update };
          delete updateData[idColumn];

          const setClause = Object.keys(updateData)
            .map((key, idx) => `${key} = $${idx + 1}`)
            .join(', ');
          
          const values = [...Object.values(updateData), id];
          
          const query = `
            UPDATE ${table}
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP
            WHERE ${idColumn} = $${values.length}
            RETURNING *
          `;
          
          const result = await client.query(query, values);
          allResults.push(...result.rows);
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return allResults;
  }

  async paginatedQuery(query, params, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    const paginatedQuery = `${query} LIMIT ${pageSize} OFFSET ${offset}`;
    const result = await db.query(paginatedQuery, params);

    return {
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async explainQuery(query, params) {
    const explainQuery = `EXPLAIN ANALYZE ${query}`;
    const result = await db.query(explainQuery, params);
    return result.rows;
  }

  clearCache() {
    this.queryCache.clear();
  }

  getCacheStats() {
    return {
      size: this.queryCache.size,
      maxSize: this.maxCacheSize,
      queries: Array.from(this.queryCache.keys())
    };
  }
}

const queryOptimizer = new QueryOptimizer();

module.exports = queryOptimizer;

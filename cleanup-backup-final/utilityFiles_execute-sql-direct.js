
import pkg from 'pg';
const { Client } = pkg;

export async function execute_sql_query(query, params = []) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('SQL Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { getDsqlEnv } from "./env";
import { withRetry } from "./retry";

export type DbClient = Pick<PoolClient, "query">;

let pool: Pool | undefined;

function createPool(): Pool {
  const env = getDsqlEnv();
  const credentials = fromNodeProviderChain();

  return new Pool({
    host: env.host,
    database: env.database,
    user: env.user,
    port: env.port,
    ssl: env.ssl,
    max: env.poolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    maxLifetimeSeconds: 600,
    allowExitOnIdle: true,
    password: async () =>
      new DsqlSigner({
        hostname: env.host,
        region: env.region,
        credentials,
      }).getDbConnectAdminAuthToken(),
  });
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function writeTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withRetry(() => transaction(work));
}

export async function closeDbPool(): Promise<void> {
  if (!pool) return;

  const activePool = pool;
  pool = undefined;
  await activePool.end();
}

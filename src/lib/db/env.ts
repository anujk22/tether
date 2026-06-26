export type DsqlEnv = {
  host: string;
  database: string;
  user: string;
  port: number;
  ssl: boolean;
  region: string;
  poolMax: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePort(value: string): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DSQL_PORT must be a positive integer");
  }

  return port;
}

function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error("DSQL_SSL must be either true or false");
}

function parsePoolMax(value: string | undefined): number {
  if (!value) return 3;

  const poolMax = Number(value);

  if (!Number.isInteger(poolMax) || poolMax <= 0) {
    throw new Error("DSQL_POOL_MAX must be a positive integer");
  }

  return poolMax;
}

export function getDsqlEnv(): DsqlEnv {
  return {
    host: requireEnv("DSQL_HOST"),
    database: requireEnv("DSQL_DATABASE"),
    user: requireEnv("DSQL_USER"),
    port: parsePort(requireEnv("DSQL_PORT")),
    ssl: parseBoolean(requireEnv("DSQL_SSL")),
    region: requireEnv("AWS_REGION"),
    poolMax: parsePoolMax(process.env.DSQL_POOL_MAX),
  };
}

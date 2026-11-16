import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlClient: NeonQueryFunction<false, false> | undefined;

export function getNeonSql() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured on the server.");
  }

  sqlClient ??= neon<false, false>(connectionString, {
    arrayMode: false,
    fullResults: false,
  });
  return sqlClient;
}

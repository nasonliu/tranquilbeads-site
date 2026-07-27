import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type RetailSql = NeonQueryFunction<false, false>;

const verified = new Map<string, Promise<void>>();

function configuredDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const identity = process.env.RETAIL_DATABASE_IDENTITY;
  if (!connectionString || !identity) throw new Error("retail_database_identity_unavailable");
  return { connectionString, identity };
}

async function verify(raw: RetailSql, connectionString: string, identity: string) {
  const key = `${connectionString}\n${identity}`;
  let check = verified.get(key);
  if (!check) {
    check = (async () => {
      const rows = await raw`SELECT identity FROM retail_runtime_environment WHERE singleton=true`;
      if (rows.length !== 1 || rows[0]?.identity !== identity) throw new Error("retail_database_identity_mismatch");
    })();
    verified.set(key, check);
    check.catch(() => verified.delete(key));
  }
  await check;
}

export function guardedRetailSql(): RetailSql {
  const { connectionString, identity } = configuredDatabase();
  const raw = neon(connectionString) as RetailSql;
  return new Proxy(raw, {
    apply(target, thisArg, args) {
      return verify(raw, connectionString, identity).then(() => Reflect.apply(target, thisArg, args));
    },
    get(target, property, receiver) {
      if (property === "transaction") {
        return async (...args: unknown[]) => {
          await verify(raw, connectionString, identity);
          return Reflect.apply(Reflect.get(target, property, receiver) as (...values: unknown[]) => unknown, target, args);
        };
      }
      return Reflect.get(target, property, receiver);
    },
  }) as RetailSql;
}

export async function assertRetailDatabaseIdentity() {
  const { connectionString, identity } = configuredDatabase();
  const raw = neon(connectionString) as RetailSql;
  await verify(raw, connectionString, identity);
}

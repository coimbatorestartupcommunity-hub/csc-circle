import type { RedisCommands } from "@/lib/redis/client";

/** In-memory RedisCommands double with expiry semantics for unit tests. */
export class InMemoryRedis implements RedisCommands {
  private store = new Map<string, { value: string; expiresAt: number | null }>();
  calls: string[] = [];

  async ping(): Promise<string> {
    this.calls.push("ping");
    return "PONG";
  }

  private read(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    this.calls.push(`get:${key}`);
    const raw = this.read(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set(key: string, value: unknown, options?: { ex?: number; nx?: boolean }): Promise<unknown> {
    this.calls.push(`set:${key}`);
    if (options?.nx && this.read(key) !== null) return null;
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    this.store.set(key, {
      value: raw,
      expiresAt: options?.ex ? Date.now() + options.ex * 1000 : null,
    });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    this.calls.push(`del:${keys.join(",")}`);
    let removed = 0;
    for (const key of keys) {
      if (this.read(key) !== null) removed += 1;
      this.store.delete(key);
    }
    return removed;
  }

  async incr(key: string): Promise<number> {
    this.calls.push(`incr:${key}`);
    const current = this.read(key);
    const next = (current === null ? 0 : Number(current)) + 1;
    const entry = this.store.get(key);
    this.store.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? null });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.calls.push(`expire:${key}`);
    const entry = this.store.get(key);
    if (!entry || this.read(key) === null) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    this.calls.push(`ttl:${key}`);
    const entry = this.store.get(key);
    if (!entry || this.read(key) === null) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    this.calls.push(`eval:${keys.join(",")}`);
    if (script.includes('redis.call("del"') && keys.length === 1) {
      const current = this.read(keys[0]);
      if (current === String(args[0])) {
        this.store.delete(keys[0]);
        return 1;
      }
      return 0;
    }
    throw new Error("unsupported script in test double");
  }

  async scan(cursor: number, options?: { match?: string; count?: number }): Promise<[number, string[]]> {
    this.calls.push("scan");
    const pattern = (options?.match ?? "*").replace(/\*/g, ".*");
    const re = new RegExp(`^${pattern}$`);
    const keys = [...this.store.keys()].filter((k) => this.read(k) !== null && re.test(k));
    const count = options?.count ?? 10;
    const slice = keys.slice(cursor, cursor + count);
    const next = cursor + count >= keys.length ? 0 : cursor + count;
    return [next, slice];
  }

  /** Raw stored value (bypasses JSON parse) for envelope assertions. */
  raw(key: string): string | null {
    return this.read(key);
  }

  keys(): string[] {
    return [...this.store.keys()].filter((k) => this.read(k) !== null);
  }
}

/** Double that throws on every command, simulating a Redis outage. */
export class FailingRedis implements RedisCommands {
  async ping(): Promise<string> { throw new Error("connection refused"); }
  async get(): Promise<null> { throw new Error("connection refused"); }
  async set(): Promise<unknown> { throw new Error("connection refused"); }
  async del(): Promise<number> { throw new Error("connection refused"); }
  async incr(): Promise<number> { throw new Error("connection refused"); }
  async expire(): Promise<number> { throw new Error("connection refused"); }
  async ttl(): Promise<number> { throw new Error("connection refused"); }
  async eval(): Promise<unknown> { throw new Error("connection refused"); }
  async scan(): Promise<[number, string[]]> { throw new Error("connection refused"); }
}

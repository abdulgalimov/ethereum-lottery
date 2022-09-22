import config from "./config";
import { createClient as createRedisClient, RedisClientType } from "redis";
import { SaveData } from "./types";

export class Db {
  async save(id: string, data: SaveData) {
    await client.set(id, JSON.stringify(data));
  }

  async load(id: string): Promise<SaveData | null> {
    const source = await client.get(id);
    if (!source) {
      return null;
    }

    return JSON.parse(source) as SaveData;
  }
}

let client: RedisClientType;
export async function create() {
  client = createRedisClient({
    database: config.redis.databaseIndex,
  });
  await client.connect();

  return new Db();
}

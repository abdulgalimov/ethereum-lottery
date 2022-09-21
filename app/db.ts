import { createClient as createRedisClient, RedisClientType } from "redis";
import * as process from "process";
import { SaveData } from "./types";

const REDIS_DATABASE: number = +`${process.env.REDIS_DATABASE}` || 0;

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
    database: REDIS_DATABASE,
  });
  await client.connect();

  return new Db();
}

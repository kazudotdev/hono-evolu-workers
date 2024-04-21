import { Db } from "../type";

export const up = async (db: Db): Promise<void> => {
  await db.schema
    .createTable("message")
    .ifNotExists()
    .addColumn("timestamp", "text")
    .addColumn("userId", "text")
    .addColumn("content", "blob")
    .execute();

  await db.schema
    .createTable("merkleTree")
    .ifNotExists()
    .addColumn("userId", "text", (col) => col.primaryKey())
    .addColumn("merkleTree", "text")
    .execute();

  await db.schema
    .createIndex("messageIndex")
    .ifNotExists()
    .on("message")
    .columns(["userId", "timestamp"])
    .execute();
};

export const down = async (db: Db): Promise<void> => {
  await db.schema.dropTable("message").execute();
  await db.schema.dropTable("merkleTree").execute();
  await db.schema.dropIndex("messageIndex").execute();
};

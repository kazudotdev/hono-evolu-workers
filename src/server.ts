import {
  SyncRequest,
  diffMerkleTrees,
  initialMerkleTree,
  insertIntoMerkleTree,
  merkleTreeToString,
  makeSyncTimestamp,
  unsafeMerkleTreeFromString,
  unsafeTimestampFromString,
  timestampToString,
  TimestampString,
  SyncResponse,
} from "@evolu/common";
import { BadRequestError, Db, Database } from "./type";
import { up } from "./db/migration";

import { sql } from "kysely";
import { Effect } from "effect";

interface Server {
  setup(): Promise<void>;
  sync(body: Uint8Array): Promise<Uint8Array>;
}

export { Database };

export class BaseServer implements Server {
  private db: Db;
  constructor({ db }: { db: Db }) {
    this.db = db;
  }
  async setup(): Promise<void> {
    return up(this.db);
  }

  async sync(body: Uint8Array) {
    try {
      const request = SyncRequest.fromBinary(body);
      const merkleTree = await this.db
        .transaction()
        .setIsolationLevel("serializable")
        .execute(async (trx) => {
          let merkleTree = await trx
            .selectFrom("merkleTree")
            .select("merkleTree")
            .where("userId", "=", request.userId)
            .executeTakeFirst()
            .then((row) => {
              if (!row) return initialMerkleTree;
              return unsafeMerkleTreeFromString(row.merkleTree);
            });
          if (request.messages.length === 0) return merkleTree;

          for (const message of request.messages) {
            const { numInsertedOrUpdatedRows } = await trx
              .insertInto("message")
              .values({
                content: message.content,
                timestamp: message.timestamp,
                userId: request.userId,
              })
              .onConflict((oc) => oc.doNothing())
              .executeTakeFirst();
            if (numInsertedOrUpdatedRows === 1n) {
              merkleTree = insertIntoMerkleTree(
                unsafeTimestampFromString(message.timestamp),
              )(merkleTree);
            }
          }

          const merkleTreeString = merkleTreeToString(merkleTree);
          await trx
            .insertInto("merkleTree")
            .values({
              userId: request.userId,
              merkleTree: merkleTreeString,
            })
            .onConflict((oc) =>
              oc.doUpdateSet({ merkleTree: merkleTreeString }),
            )
            .execute();
          return merkleTree;
        });

      const messages = await Effect.runPromise(
        diffMerkleTrees(
          merkleTree,
          unsafeMerkleTreeFromString(request.merkleTree),
        ).pipe(
          Effect.map(makeSyncTimestamp),
          Effect.map(timestampToString),
          Effect.flatMap((timestamp) =>
            Effect.promise(() =>
              this.db
                .selectFrom("message")
                .select(["timestamp", "content"])
                .where("userId", "=", request.userId)
                .where("timestamp", ">=", timestamp)
                .where(
                  "timestamp",
                  "not like",
                  sql<TimestampString>`'%' || ${request.nodeId}`,
                )
                .orderBy("timestamp")
                .execute(),
            ),
          ),
          Effect.orElseSucceed(() => []),
        ),
      );
      const response = SyncResponse.toBinary({
        merkleTree: merkleTreeToString(merkleTree),
        messages,
      });
      return Buffer.from(response);
    } catch (error) {
      const err = new BadRequestError(error);
      throw err;
    }
  }
}

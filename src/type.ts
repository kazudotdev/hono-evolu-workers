import { MerkleTreeString, OwnerId, TimestampString } from "@evolu/common";
import { Kysely } from "kysely";

export interface MessageTable {
  readonly timestamp: TimestampString;
  readonly userId: OwnerId;
  readonly content: Uint8Array;
}

export interface MerkleTreeTable {
  readonly userId: OwnerId;
  readonly merkleTree: MerkleTreeString;
}

export interface Database {
  readonly message: MessageTable;
  readonly merkleTree: MerkleTreeTable;
}

export type Db = Kysely<Database>;

export class BadRequestError extends Error {
  readonly error: unknown;
  readonly _tag: string = "BadRequestError";
  constructor(error: unknown) {
    super();
    this.error = error;
  }
}

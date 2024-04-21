import { Hono } from "hono";
import { BaseServer, Database } from "./server";
import { Kysely } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";

export type Env = {};

export type Variables = {
  DB: Kysely<Database>;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use("*", async (c, next) => {
    const dialect = new LibsqlDialect({
      url: "http://localhost:8080",
    });
    const db = new Kysely<Database>({
      dialect,
    });
    c.set("DB", db);
    await next();
  })
  .get("/", async (c) => {
    const db = c.get("DB");
    const server = new BaseServer({ db });
    await server.setup();
    const result = await db.selectFrom("message").execute();
    console.log({ result });
    return c.text("hoge");
  });
export default app;

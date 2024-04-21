/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Hono } from 'hono';
import { BaseServer, Database } from '@server/src/server';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';

export type Env = {
	DB: D1Database;
};

export type Variables = {
	server: BaseServer;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>()
	.use('*', async (c, next) => {
		const db = new Kysely<Database>({
			dialect: new D1Dialect({ database: c.env.DB }),
		});
		const server = new BaseServer({ db });
		c.set('server', server);
		await next();
	})
	.options('/sync', async (c) => {
		const server = c.get('server');
		const body = await c.req.arrayBuffer();
		const buffer = await server.sync(new Uint8Array(body));
		return c.body(buffer);
	});

export default app;

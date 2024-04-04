// @/server.js
import { readFileSync } from "fs";
import { resolve } from "path";
import express, { Express } from 'express'
import compression from 'compression'
import { ViteDevServer } from "vite";

export type CreateServerOptions = {
  publicDir: string;
  indexHtmlPath: string;
  serverPath: string;
  serverEntryFile: string;
  dev?: boolean;
  viteServer: ViteDevServer,
};

export async function createSsrServer(options: CreateServerOptions): Promise<Express> {
  const app = express();
  
  const vite = options.viteServer;

  /**
   * set middlewares.
   */
  app.use(compression());
  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const template = readFileSync(resolve(options.indexHtmlPath), "utf-8");
      const tranformedTemplate = await vite.transformIndexHtml(url, template);
      const serverModule = await vite.ssrLoadModule(options.serverEntryFile);
      const render = serverModule?.render || serverModule?.default;
      const loadScripts = serverModule?.loadScripts;

      if (!render) throw new Error('implement a `render` method for the dev server to run, or turn `ssr: false` in your `bit-app` file')
      const appHtml = await render({ path: url });
      const scripts = loadScripts ? await loadScripts() : undefined;
      const htmlWithBody = tranformedTemplate.replace(`<!--ssr-outlet-->`, appHtml);
      const html = scripts 
        ? htmlWithBody.replace('<!--ssr-head-outlet-->', scripts)
        : htmlWithBody.replace('<!--ssr-head-outlet-->', '');

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    } catch (error: any) {
      if (vite) vite.ssrFixStacktrace(error);
      // eslint-disable-next-line no-console
      console.error(error);
      next(error);
    }
  });

  return app;
}

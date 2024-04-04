import type { Logger } from '@teambit/logger';
import { chromium } from 'playwright';
import net from 'net';
import { existsSync, readFile } from 'fs';
import http from 'http';
import { extname, join } from 'path';
import { AsyncQueue } from './queue';

const queue = new AsyncQueue(20, 500, false);

let url = 'http://localhost:3000';

async function getPortFree() {
  return new Promise((res) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      // @ts-ignore-next-line
      const port = srv.address()?.port;
      srv.close(() => res(port));
    });
  });
}

const results: { route: string; html: string; fullUrl: string }[] = [];

export async function prerenderer(
  routes: string[],
  cwd: string,
  logger: Logger,
  isSupported: boolean
) {
  // wait for the page to be fully loaded, skip external resources
  const browser = await chromium.launch({
    headless: true,
    executablePath: isSupported ? undefined : '/usr/bin/chromium-browser',
  });

  const context = await browser.newContext();
  const port = (await getPortFree()) as number;

  const server = http.createServer((req, res) => {
    const filePath = join(
      cwd,
      req.url === '/' ? 'index.html' : (req.url as string)
    );
    const extension = String(extname(filePath)).toLowerCase();

    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[extension] || 'application/octet-stream';

    const exists = existsSync(filePath);

    if (!exists) {
      // send the index.html file if the file does not exist
      return readFile(join(cwd, 'index.html'), (error, content) => {
        if (error) {
          console.error(error);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        }
      });
    }

    readFile(filePath, (error, content) => {
      if (error) {
        console.error(error);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });

    return null;
  });

  server.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
  });

  url = `http://localhost:${port}`;

  const longProcessLogger = logger.createLongProcessLogger(
    'prerender',
    routes.length
  );

  routes.map((route) => {
    return queue.addTask(async () => {
      const timeout = setTimeout(() => {
        throw new Error(`Timeout for route ${route}`);
      }, 120000);

      const page = await context.newPage();

      // block external resources
      await page.route('**/*', (e) => {
        if (!e.request().url().startsWith(url)) {
          e.abort();
        } else {
          e.continue();
        }
      });

      // set the timeout to 0 to wait for the page to be fully loaded
      page.setDefaultTimeout(0);

      await page.goto(`${url}${route}`);
      await page.waitForLoadState('load');
      const html = await page.content();
      await page.close();

      longProcessLogger.logProgress(route);

      results.push({ route, html, fullUrl: `${url}${route}` });

      clearTimeout(timeout);
    });
  });

  queue.startProcessing();

  await queue.waitUntilAllFinished();

  longProcessLogger.end();

  await browser.close();

  return results;
}

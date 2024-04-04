import express, { Application } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

async function createServer(): Promise<Application> {
  const app = express();
  const publicPath = __dirname;
  app.use(express.static(publicPath, {
    index: false
  }));
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serverComponent = require(join(publicPath, './server-ssr'));

  app.use('/', async (req, res) => {
    const content = await serverComponent.render({ path: req.url });
    const loadScripts = serverComponent?.loadScripts;
    const indexHtml = readFileSync(join(publicPath, 'index.html')).toString('utf-8');
    const scripts = loadScripts ? await loadScripts() : undefined;
    const htmlWithBody = indexHtml.replace(`<!--ssr-outlet-->`, content);
    const html = scripts 
      ? htmlWithBody.replace('<!--ssr-head-outlet-->', scripts)
      : htmlWithBody.replace('<!--ssr-head-outlet-->', '');

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  return app;
} 

createServer().then((server) => {
  const args = process.argv.slice(2) || [];
  const [targetPort] = args;
  const port = targetPort || 8080;
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server is listening to port ${port}`);
  });  
});

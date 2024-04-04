export class NetlifyError extends Error {
  constructor(err: string) {
    super(`Netlify Error: ${err}`);
  }
}

export class Redirects {
  constructor(readonly customRedirects: string) {}

  get catchAllToIndex(): string {
    return `/* /index.html`;
  }

  static customRedirects(customRedirects: string): Redirects {
    return new Redirects(customRedirects);
  }

  get customRedirectsString(): string {
    return this.customRedirects;
  }
}

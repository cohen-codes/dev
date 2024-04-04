export interface NetlifyCreateSiteOpts {
  name: string;
  custom_domain?: string;
  password?: string;
  force_ssl?: boolean;
  processing_settings?: {
    css?: {
      bundle?: boolean;
      minify?: boolean;
    };
    js?: {
      bundle?: boolean;
      minify?: boolean;
    };
    html?: {
      pretty_urls?: boolean;
      canonical_urls?: boolean;
    };
    images?: {
      optimize?: boolean;
    };
  };
}

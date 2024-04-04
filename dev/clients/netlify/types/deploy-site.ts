export interface NetlifyUploadIndexRes {
  id: string;
  required: string[];
  required_functions: string[];
}

export interface NetlifyDeployRes {
  id: string;
  site_id: string;
  build_id: any;
  state: string;
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  deploy_url: string;
  deploy_ssl_url: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  error_message: any;
  required: any[];
  required_functions: any;
  commit_ref: any;
  review_id: any;
  branch: any;
  commit_url: any;
  skipped: any;
  locked: any;
  log_access_attributes: LogAccessAttributes;
  title: any;
  review_url: any;
  published_at: any;
  context: string;
  deploy_time: any;
  available_functions: any[];
  screenshot_url: any;
  site_capabilities: SiteCapabilities;
  committer: any;
  skipped_log: any;
  manual_deploy: boolean;
  file_tracking_optimization: boolean;
  plugin_state: string;
  lighthouse_plugin_scores: any;
  links: Links;
  framework: any;
  entry_path: any;
  views_count: any;
  function_schedules: any[];
  public_repo: any;
  pending_review_reason: any;
  lighthouse: any;
  summary: Summary;
}

export interface LogAccessAttributes {
  type: string;
  url: string;
  database: string;
  endpoint: string;
  path: string;
  token: string;
}

export interface SiteCapabilities {
  title: string;
  asset_acceleration: boolean;
  form_processing: boolean;
  cdn_propagation: string;
  domain_aliases: boolean;
  secure_site: boolean;
  sso_secure_site: boolean;
  secure_site_context: boolean;
  prerendering: boolean;
  proxying: boolean;
  ssl: string;
  rate_cents: number;
  yearly_rate_cents: number;
  ipv6_domain: string;
  branch_deploy: boolean;
  managed_dns: boolean;
  geo_ip: boolean;
  split_testing: boolean;
  id: string;
  cdn_tier: string;
}

export interface Links {
  permalink: string;
  alias: string;
  branch: any;
}

export interface Summary {
  status: string;
  messages: any[];
}

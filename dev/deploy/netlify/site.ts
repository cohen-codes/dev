export interface Site {
  id: string;
  site_id: string;
  plan: string;
  ssl_plan: null;
  premium: boolean;
  claimed: boolean;
  name: string;
  custom_domain: null;
  domain_aliases: any[];
  password: null;
  notification_email: null;
  url: string;
  admin_url: string;
  deploy_id: string;
  build_id: string;
  deploy_url: string;
  state: string;
  screenshot_url: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  error_message: null;
  ssl: boolean;
  ssl_url: string;
  force_ssl: null;
  ssl_status: null;
  max_domain_aliases: number;
  build_settings: BuildSettings;
  processing_settings: ProcessingSettings;
  prerender: null;
  prerender_headers: null;
  deploy_hook: string;
  published_deploy: PublishedDeploy;
  managed_dns: boolean;
  jwt_secret: null;
  jwt_roles_path: string;
  account_slug: string;
  account_name: string;
  account_type: string;
  capabilities: Capabilities;
  dns_zone_id: null;
  identity_instance_id: null;
  use_functions: null;
  use_edge_handlers: null;
  parent_user_id: null;
  automatic_tls_provisioning: null;
  disabled: null;
  lifecycle_state: string;
  id_domain: string;
  use_lm: null;
  build_image: string;
  automatic_tls_provisioning_expired: boolean;
  analytics_instance_id: null;
  functions_region: null;
  functions_config: FunctionsConfig;
  plugins: any[];
  account_subdomain: null;
  functions_env: Env;
  default_domain: string;
}

export interface BuildSettings {
  cmd: null;
  dir: null;
  env: Env;
  created_at: string;
  updated_at: string;
  private_logs: null;
  allowed_branches: string[];
  functions_dir: null;
  installation_id: null;
  skip_prs: null;
  untrusted_flow: string;
  base_rel_dir: boolean;
  stop_builds: boolean;
  public_repo: boolean;
  skip_automatic_builds: null;
  provider: string;
  repo_type: string;
  repo_url: string;
  repo_branch: string;
  repo_path: string;
  base: null;
  deploy_key_id: string;
}

export interface Env {}

export interface Capabilities {
  title: string;
  asset_acceleration: boolean;
  form_processing: boolean;
  cdn_propagation: string;
  build_node_pool: string;
  domain_aliases: boolean;
  secure_site: boolean;
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

export interface FunctionsConfig {
  site_created_at: string;
}

export interface ProcessingSettings {
  css: CSS;
  js: CSS;
  images: Images;
  html: HTML;
  skip: boolean;
  ignore_html_forms: boolean;
}

export interface CSS {
  bundle: boolean;
  minify: boolean;
}

export interface HTML {
  pretty_urls: boolean;
}

export interface Images {
  optimize: boolean;
}

export interface PublishedDeploy {
  id: string;
  site_id: string;
  build_id: string;
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
  error_message: null;
  required: any[];
  required_functions: any[];
  commit_ref: string;
  review_id: null;
  branch: string;
  commit_url: string;
  skipped: null;
  locked: null;
  log_access_attributes: LogAccessAttributes;
  title: string;
  review_url: null;
  published_at: string;
  context: string;
  deploy_time: number;
  available_functions: any[];
  screenshot_url: string;
  site_capabilities: Capabilities;
  committer: string;
  skipped_log: null;
  manual_deploy: boolean;
  file_tracking_optimization: boolean;
  plugin_state: string;
  has_edge_handlers: boolean;
  links: Links;
  framework: null;
  entry_path: null;
}

export interface Links {
  permalink: string;
  alias: string;
}

export interface LogAccessAttributes {
  type: string;
  url: string;
  endpoint: string;
  path: string;
  token: string;
}

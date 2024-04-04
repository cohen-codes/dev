export interface NetlifyGetSiteResponse {
  id: string;
  premium: boolean;
  claimed: boolean;
  name: string;
  custom_domain: string;
  notification_email: string;
  url: string;
  admin_url: string;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

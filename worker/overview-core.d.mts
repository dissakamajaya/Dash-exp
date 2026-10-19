export function buildOverview(options: {
  origin: string;
  token: string;
  analyticsToken?: string;
  accountId?: string;
}): Promise<Record<string, unknown>>;

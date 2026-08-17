const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
const GOOGLE_ADS_API_VERSION = "v24";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export type GoogleAdsConfig = {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId?: string;
  loginCustomerId?: string;
};

export type GoogleAdsTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export type GoogleAdsApiError = {
  error?: string;
  error_description?: string;
  message?: string;
  details?: unknown;
};

export type ConversionActionSummary = {
  id?: string;
  resourceName?: string;
  name?: string;
  status?: string;
  type?: string;
  category?: string;
  primaryForGoal?: boolean;
  includeInConversionsMetric?: boolean;
};

export type ConversionActionPlanInput = {
  customerId: string;
  name: string;
  category: string;
  type?: string;
  status?: string;
  primaryForGoal?: boolean;
  includeInConversionsMetric?: boolean;
};

type FetchLike = typeof fetch;

export function normalizeCustomerId(customerId: string) {
  return customerId.replaceAll("-", "").trim();
}

export function getGoogleAdsConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
) {
  const config = {
    developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
    clientId: env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: env.GOOGLE_ADS_CLIENT_SECRET,
    refreshToken: env.GOOGLE_ADS_REFRESH_TOKEN,
    customerId: env.GOOGLE_ADS_CUSTOMER_ID,
    loginCustomerId: env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => {
      if (key === "customerId" || key === "loginCustomerId") return false;
      return !value?.trim();
    })
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Google Ads API environment values: ${missing.join(", ")}`,
    );
  }

  return {
    developerToken: config.developerToken!.trim(),
    clientId: config.clientId!.trim(),
    clientSecret: config.clientSecret!.trim(),
    refreshToken: config.refreshToken!.trim(),
    customerId: config.customerId?.trim(),
    loginCustomerId: config.loginCustomerId?.trim(),
  } satisfies GoogleAdsConfig;
}

export function buildGoogleAdsAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state?: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GOOGLE_ADS_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });

  if (input.state) {
    params.set("state", input.state);
  }

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleAdsAuthCode(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  fetchImpl?: FetchLike;
}) {
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
      grant_type: "authorization_code",
    }),
  });

  return readGoogleApiResponse<GoogleAdsTokenResponse>(response);
}

export async function refreshGoogleAdsAccessToken(
  config: Pick<GoogleAdsConfig, "clientId" | "clientSecret" | "refreshToken">,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  return readGoogleApiResponse<GoogleAdsTokenResponse>(response);
}

export async function listAccessibleGoogleAdsCustomers(
  config: GoogleAdsConfig,
  fetchImpl: FetchLike = fetch,
) {
  const accessToken = await getAccessToken(config, fetchImpl);
  const response = await fetchImpl(`${GOOGLE_ADS_API_BASE_URL}/customers:listAccessibleCustomers`, {
    headers: buildGoogleAdsHeaders(config, accessToken),
  });

  return readGoogleApiResponse<{ resourceNames?: string[] }>(response);
}

export async function googleAdsSearchStream<T>(
  config: GoogleAdsConfig,
  customerId: string,
  query: string,
  fetchImpl: FetchLike = fetch,
) {
  const accessToken = await getAccessToken(config, fetchImpl);
  const normalizedCustomerId = normalizeCustomerId(customerId);
  const response = await fetchImpl(
    `${GOOGLE_ADS_API_BASE_URL}/customers/${normalizedCustomerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: buildGoogleAdsHeaders(config, accessToken),
      body: JSON.stringify({ query }),
    },
  );

  const chunks = await readGoogleApiResponse<Array<{ results?: T[] }>>(response);
  return chunks.flatMap((chunk) => chunk.results ?? []);
}

export async function listGoogleAdsConversionActions(
  config: GoogleAdsConfig,
  customerId = config.customerId,
  fetchImpl: FetchLike = fetch,
) {
  if (!customerId) {
    throw new Error("Missing Google Ads customer ID.");
  }

  const rows = await googleAdsSearchStream<{ conversionAction?: Record<string, unknown> }>(
    config,
    customerId,
    [
      "SELECT",
      "conversion_action.id,",
      "conversion_action.resource_name,",
      "conversion_action.name,",
      "conversion_action.status,",
      "conversion_action.type,",
      "conversion_action.category,",
      "conversion_action.primary_for_goal,",
      "conversion_action.include_in_conversions_metric",
      "FROM conversion_action",
      "ORDER BY conversion_action.name",
    ].join(" "),
    fetchImpl,
  );

  return rows.map((row) => mapConversionAction(row.conversionAction ?? {}));
}

export function buildGoogleAdsConversionActionPlan(input: ConversionActionPlanInput) {
  const normalizedCustomerId = normalizeCustomerId(input.customerId);
  const create = {
    name: input.name,
    category: input.category,
    type: input.type ?? "WEBPAGE",
    status: input.status ?? "ENABLED",
    primaryForGoal: input.primaryForGoal ?? true,
    includeInConversionsMetric: input.includeInConversionsMetric ?? true,
  };

  return {
    dryRun: true,
    customerId: normalizedCustomerId,
    endpoint: `${GOOGLE_ADS_API_BASE_URL}/customers/${normalizedCustomerId}/conversionActions:mutate`,
    method: "POST",
    body: {
      operations: [{ create }],
    },
    notes: [
      "This is a dry-run plan only; it does not create anything in Google Ads.",
      "Review category/type and tagging implementation before sending a mutate request.",
    ],
  };
}

async function getAccessToken(config: GoogleAdsConfig, fetchImpl: FetchLike) {
  const token = await refreshGoogleAdsAccessToken(config, fetchImpl);

  if (!token.access_token) {
    throw new Error("Google OAuth response did not include an access token.");
  }

  return token.access_token;
}

function buildGoogleAdsHeaders(config: GoogleAdsConfig, accessToken: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": config.developerToken,
    "Content-Type": "application/json",
  };

  if (config.loginCustomerId) {
    headers["login-customer-id"] = normalizeCustomerId(config.loginCustomerId);
  }

  return headers;
}

async function readGoogleApiResponse<T>(response: Response) {
  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) as T | GoogleAdsApiError : {};

  if (!response.ok) {
    const details = typeof body === "object" && body !== null ? body : {};
    const message =
      "message" in details && typeof details.message === "string"
        ? details.message
        : "error_description" in details && typeof details.error_description === "string"
          ? details.error_description
          : `Google API request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return body as T;
}

function mapConversionAction(action: Record<string, unknown>): ConversionActionSummary {
  return {
    id: asString(action.id),
    resourceName: asString(action.resourceName),
    name: asString(action.name),
    status: asString(action.status),
    type: asString(action.type),
    category: asString(action.category),
    primaryForGoal: asBoolean(action.primaryForGoal),
    includeInConversionsMetric: asBoolean(action.includeInConversionsMetric),
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

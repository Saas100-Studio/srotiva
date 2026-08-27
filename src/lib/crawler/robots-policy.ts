import { MorselApiError } from "../api/errors.ts";
import { ROBOTS_CACHE_TTL_MS } from "../config/limits.ts";
import {
  fetchDocument,
  type FetchDocumentOptions,
} from "./http-fetcher.ts";
import { normalizeUserUrl } from "./url-safety.ts";

type RobotsRule = {
  directive: "allow" | "disallow";
  path: string;
};

type RobotsGroup = {
  agents: string[];
  rules: RobotsRule[];
};

type RobotsCacheEntry = {
  expiresAt: number;
  bodyText: string | null;
};

export type CheckRobotsAllowedOptions = {
  targetUrl: string | URL;
  userAgent: string;
  fetchOptions?: FetchDocumentOptions;
  now?: () => number;
};

const robotsCache = new Map<string, RobotsCacheEntry>();

function parseRobots(bodyText: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let hasRules = false;

  for (const sourceLine of bodyText.split(/\r?\n/)) {
    const line = sourceLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || hasRules) {
        current = { agents: [], rules: [] };
        groups.push(current);
        hasRules = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (
      current &&
      (field === "allow" || field === "disallow")
    ) {
      current.rules.push({ directive: field, path: value });
      hasRules = true;
    }
  }

  return groups;
}

function crawlerToken(userAgent: string): string {
  return userAgent.trim().split(/[\s/]/, 1)[0]!.toLowerCase();
}

function rulesForUserAgent(groups: RobotsGroup[], userAgent: string): RobotsRule[] {
  const token = crawlerToken(userAgent);
  const exactMatches = groups.filter((group) => group.agents.includes(token));
  const applicableGroups = exactMatches.length > 0
    ? exactMatches
    : groups.filter((group) => group.agents.includes("*"));
  return applicableGroups.flatMap((group) => group.rules);
}

function ruleMatches(path: string, pattern: string): boolean {
  if (!pattern) return false;
  const endAnchored = pattern.endsWith("$");
  const source = endAnchored ? pattern.slice(0, -1) : pattern;
  const escaped = source
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}${endAnchored ? "$" : ""}`).test(path);
}

function isPathAllowed(rules: RobotsRule[], path: string): boolean {
  let winner: RobotsRule | null = null;
  for (const rule of rules) {
    if (!ruleMatches(path, rule.path)) continue;
    if (
      !winner ||
      rule.path.length > winner.path.length ||
      (rule.path.length === winner.path.length && rule.directive === "allow")
    ) {
      winner = rule;
    }
  }
  return winner?.directive !== "disallow";
}

async function getRobotsBody(
  robotsUrl: URL,
  options: CheckRobotsAllowedOptions,
): Promise<string | null> {
  const now = options.now ?? Date.now;
  const key = robotsUrl.origin;
  const cached = robotsCache.get(key);
  if (cached && cached.expiresAt > now()) return cached.bodyText;

  let bodyText: string | null;
  try {
    const result = await fetchDocument(robotsUrl, {
      ...options.fetchOptions,
      userAgent: options.userAgent,
    });
    bodyText = result.bodyText;
  } catch (error) {
    if (
      error instanceof MorselApiError &&
      error.code === "FETCH_HTTP_ERROR" &&
      error.details.status === 404
    ) {
      bodyText = null;
    } else {
      throw error;
    }
  }

  robotsCache.set(key, {
    bodyText,
    expiresAt: now() + ROBOTS_CACHE_TTL_MS,
  });
  return bodyText;
}

export async function checkRobotsAllowed(
  options: CheckRobotsAllowedOptions,
): Promise<boolean> {
  const targetUrl = normalizeUserUrl(options.targetUrl.toString());
  const robotsUrl = new URL("/robots.txt", targetUrl.origin);
  const bodyText = await getRobotsBody(robotsUrl, options);
  if (bodyText === null) return true;

  const path = `${targetUrl.pathname}${targetUrl.search}`;
  const allowed = isPathAllowed(
    rulesForUserAgent(parseRobots(bodyText), options.userAgent),
    path,
  );
  if (!allowed) {
    throw new MorselApiError(
      403,
      "ROBOTS_DISALLOWED",
      "The site's robots policy does not allow this URL to be fetched.",
      { url: targetUrl.href },
    );
  }
  return true;
}

export function clearRobotsCache(): void {
  robotsCache.clear();
}

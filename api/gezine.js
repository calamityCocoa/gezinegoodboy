// Vercel function: GET /api/gezine
// Returns gezine's HackerOne hacktivity as JSON, with a check for reports to Nintendo.
// Vercel's CDN caches it for 10 minutes so HackerOne isn't hammered.
// Requests that get past the cache are also rate limited per visitor (see _lib.js).

import { dbReady, rateLimit, reply } from "./_lib.js";

const H1_GRAPHQL = "https://hackerone.com/graphql";
const REPORTER = "gezine";
const WATCH_COMPANY = "nintendo";

const QUERY = `query HacktivitySearchQuery($queryString: String!, $from: Int, $size: Int, $sort: SortInput!) {
  search(index: CompleteHacktivityReportIndex, query_string: $queryString, from: $from, size: $size, sort: $sort) {
    total_count
    nodes {
      __typename
      ... on HacktivityDocument {
        _id
        severity_rating
        report { _id title url disclosed_at }
        team { handle name url }
        latest_disclosable_action
        latest_disclosable_activity_at
        submitted_at
        disclosed
      }
    }
  }
}`;

async function h1Request(csrf) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (csrf) headers["x-csrf-token"] = csrf;
  return fetch(H1_GRAPHQL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      operationName: "HacktivitySearchQuery",
      query: QUERY,
      variables: {
        // No disclosed filter, so both disclosed and undisclosed come back.
        queryString: `reporter:("${REPORTER}")`,
        from: 0,
        size: 50,
        sort: { field: "latest_disclosable_activity_at", direction: "DESC" },
      },
    }),
  });
}

async function getCsrf() {
  const res = await fetch("https://hackerone.com/hacktivity");
  const m = (await res.text()).match(/<meta name="csrf-token" content="([^"]*)"/);
  return m ? m[1] : null;
}

async function fetchActivity() {
  let res = await h1Request(null);
  if (!res.ok) res = await h1Request(await getCsrf()); // retry with a CSRF token
  if (!res.ok) throw new Error(`HackerOne replied ${res.status}`);

  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map((e) => e.message).join("; "));

  const reports = (data?.data?.search?.nodes ?? [])
    .filter((n) => n?.__typename === "HacktivityDocument")
    .map((n) => {
      const company = n.team?.name || n.team?.handle || null;
      return {
        id: n._id,
        title: n.report?.title || null, // null when undisclosed
        url: n.report?.url || null,
        company, // null when HackerOne hides it
        companyUrl: n.team?.url || null,
        disclosed: !!n.disclosed,
        severity: n.severity_rating || null,
        action: n.latest_disclosable_action || null,
        activityAt: n.latest_disclosable_activity_at || n.submitted_at || null,
        isNintendo: !!company && company.toLowerCase().includes(WATCH_COMPANY),
      };
    });

  const nintendo = reports.filter((r) => r.isNintendo);
  const lastNintendoAt = nintendo.map((r) => r.activityAt).filter(Boolean).sort().at(-1) ?? null;

  return {
    checkedAt: new Date().toISOString(),
    reporter: REPORTER,
    total: data?.data?.search?.total_count ?? reports.length,
    badBoy: nintendo.length > 0,
    nintendoCount: nintendo.length,
    lastNintendoAt,
    reports,
  };
}

export async function GET(request) {
  try {
    if (dbReady()) {
      const rl = await rateLimit(request, "gezine", 30, 60).catch(() => ({ ok: true }));
      if (!rl.ok) return reply({ error: "Slow down a little and try again in a moment" }, 429, rl.headers);
    }
    return Response.json(await fetchActivity(), {
      headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=600" },
    });
  } catch (e) {
    return Response.json(
      { error: String(e?.message || e) },
      { status: 502, headers: { "cache-control": "public, s-maxage=60" } },
    );
  }
}

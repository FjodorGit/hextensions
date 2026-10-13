const API = "https://codeforces.com/api";
const TTL = 24 * 60 * 60 * 1000;
const MISS_RETRY = 60 * 60 * 1000;

let cache;
let inflight;

async function load() {
    cache ??= (await chrome.storage.local.get("problemset")).problemset ?? { fetchedAt: 0, problems: {} };
    return cache;
}

// Non-gym standings must be requested anonymously and without extra params.
async function api(method, params = {}) {
    const url = new URL(`${API}/${method}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, { credentials: "omit", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.status !== "OK") throw new Error(data?.comment ?? `HTTP ${res.status}`);
    return data.result;
}

function refreshProblemset() {
    inflight ??= api("problemset.problems")
        .then(async ({ problems }) => {
            const map = {};
            for (const p of problems) map[`${p.contestId}/${p.index}`] = [p.rating ?? null, p.tags];
            cache = { fetchedAt: Date.now(), problems: map };
            await chrome.storage.local.set({ problemset: cache });
            return cache;
        })
        .finally(() => (inflight = null));
    return inflight;
}

async function fromContest(contestId, index) {
    const key = `contest:${contestId}`;
    let entry = (await chrome.storage.local.get(key))[key];
    if (!entry || Date.now() - entry.fetchedAt > MISS_RETRY) {
        try {
            const { problems } = await api("contest.standings", { contestId });
            entry = {
                fetchedAt: Date.now(),
                problems: Object.fromEntries(problems.map((p) => [p.index, [p.rating ?? null, p.tags]])),
            };
            await chrome.storage.local.set({ [key]: entry });
        } catch (e) {
            if (!entry) throw e;
        }
    }
    return entry.problems[index];
}

async function getProblem(contestId, index) {
    let data = await load();
    const key = `${contestId}/${index}`;
    const entry = data.problems[key];
    const age = Date.now() - data.fetchedAt;

    if (entry?.[0] != null) {
        if (age > TTL) refreshProblemset().catch(() => {});
    } else if (age > MISS_RETRY) {
        data = await refreshProblemset().catch(() => data);
    }

    const found = data.problems[key] ?? (await fromContest(contestId, index));
    return found ? { rating: found[0], tags: found[1] } : null;
}

const handlers = {
    getProblem: ({ contestId, index }) => getProblem(contestId, index),
    status: async () => {
        const { fetchedAt, problems } = await load();
        return { fetchedAt, count: Object.keys(problems).length };
    },
    refresh: async () => {
        await chrome.storage.local.clear();
        cache = null;
        const { fetchedAt, problems } = await refreshProblemset();
        return { fetchedAt, count: Object.keys(problems).length };
    },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const handler = handlers[msg?.type];
    if (!handler) return false;
    handler(msg).then(
        (result) => sendResponse({ ok: true, result }),
        (e) => sendResponse({ ok: false, error: String(e?.message ?? e) }),
    );
    return true;
});

chrome.runtime.onInstalled.addListener(() => refreshProblemset().catch(() => {}));

(() => {
    const match = location.pathname.match(/^\/(?:contest\/(\d+)\/problem|problemset\/problem\/(\d+))\/([A-Za-z0-9]+)\/?$/);
    const sidebar = document.querySelector("#sidebar");
    if (!match || !sidebar) return;

    const contestId = Number(match[1] ?? match[2]);
    const index = match[3].toUpperCase();

    const RANKS = [
        [1200, "#808080"],
        [1400, "#008000"],
        [1600, "#03a89e"],
        [1900, "#0000ff"],
        [2100, "#aa00aa"],
        [2400, "#ff8c00"],
        [Infinity, "#ff0000"],
    ];

    function el(tag, props = {}, ...children) {
        const node = Object.assign(document.createElement(tag), props);
        node.append(...children);
        return node;
    }

    const tag = (text, extra = "") => el("span", { className: `cfgt-tag ${extra}`, textContent: text });

    const body = el("div", { className: "cfgt-body" }, el("span", { className: "cfgt-muted", textContent: "Loading…" }));
    const actions = el("div", { className: "cfgt-actions" });
    const box = el(
        "div",
        { className: "roundbox sidebox borderTopRound cfgt-box" },
        el("div", { className: "caption titled", textContent: "→ Problem tags" }),
        body,
        actions,
    );
    sidebar.append(box);

    function render(problem) {
        body.replaceChildren();
        if (!problem) {
            body.append(el("span", { className: "cfgt-error", textContent: "Problem not found in the Codeforces API." }));
            return;
        }

        const { rating, tags } = problem;
        if (rating != null) {
            const color = RANKS.find(([limit]) => rating < limit)[1];
            body.append(el("span", { className: "cfgt-tag cfgt-rating", textContent: `*${rating}`, style: `color:${color}` }));
        } else {
            body.append(el("span", { className: "cfgt-muted", textContent: "Not rated yet." }));
        }

        if (!tags.length) return;
        const tagList = el("div", { className: "cfgt-tags", hidden: true }, ...tags.map((t) => tag(t)));
        const toggle = el("button", { type: "button", textContent: `Show tags (${tags.length})` });
        toggle.addEventListener("click", () => {
            tagList.hidden = !tagList.hidden;
            toggle.textContent = `${tagList.hidden ? "Show" : "Hide"} tags (${tags.length})`;
        });
        body.append(tagList);
        actions.prepend(toggle);
    }

    chrome.runtime
        .sendMessage({ type: "getProblem", contestId, index })
        .then((res) => {
            if (!res?.ok) throw new Error(res?.error ?? "No response");
            render(res.result);
        })
        .catch((e) => {
            body.replaceChildren(el("span", { className: "cfgt-error", textContent: `Codeforces API error: ${e.message}` }));
        });
})();

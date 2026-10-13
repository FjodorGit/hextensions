const status = document.querySelector("#status");
const refresh = document.querySelector("#refresh");

function show(res) {
    if (!res?.ok) {
        status.textContent = `Error: ${res?.error ?? "no response"}`;
        return;
    }
    const { fetchedAt, count } = res.result;
    status.textContent = fetchedAt
        ? `${count} problems, updated ${new Date(fetchedAt).toLocaleString()}`
        : "No data cached yet";
}

chrome.runtime.sendMessage({ type: "status" }).then(show);

refresh.addEventListener("click", async () => {
    refresh.disabled = true;
    status.textContent = "Refreshing…";
    show(await chrome.runtime.sendMessage({ type: "refresh" }));
    refresh.disabled = false;
});

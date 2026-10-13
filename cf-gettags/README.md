# CF GetTags

Shows a Codeforces problem's rating in the sidebar, with its tags hidden behind a button. Forked from [importlogic/cf-getrating-extension](https://github.com/importlogic/cf-getrating-extension).

Run with `hx-run cf-gettags` from the dev shell, or build with `nix build .#cf-gettags`.

Ratings come from `problemset.problems` and are cached for 24h. Use Refresh in the popup to update them sooner.

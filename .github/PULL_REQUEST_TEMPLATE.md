## What this changes

<!-- One or two sentences. What is different after this merges? -->

## Why

<!-- The problem, the bug, or the price change that prompted it. Link an issue if there is one. -->

## Checklist

- [ ] `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally
- [ ] Tests added or updated where correctness is not obvious (pricing math, streak edges, redaction, scanner fixtures)
- [ ] README updated if the change is user-visible

## Data that leaves the machine

Answer this even if the answer is "none" — it is the part of the review that matters most.

- [ ] This PR does **not** add or widen any field in `WrappedStats`
- [ ] This PR does **not** change what `safe` redaction mode publishes
- [ ] This PR does **not** add a network call to `packages/core`

If any box above is unchecked, explain here what new information can now leave a
contributor's machine, and why it cannot identify a person, an employer, or a repo:

<!-- explanation -->

## Pricing changes only

- [ ] Link to the published price list this rate comes from:

<!-- url -->

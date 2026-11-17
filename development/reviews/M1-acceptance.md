# Milestone 1 acceptance

Lead manager decision: **Accept Milestone 1.**

Date: 2026-10-13.

## Reviews

- Product designer (`gpt-5.6-sol-high`): APPROVE WITH NONBLOCKING ISSUES. `development/reviews/M1-design.md`. Desktop homepage, listing detail, and a ~390px homepage were inspected. The search-results screenshot did not show the results region.
- Independent review (`claude-opus-5-5-xhigh`): APPROVE WITH NONBLOCKING ISSUES. `development/reviews/M1-review.md`. Tests, lint, and production build were run by the reviewer. The reviewer did not visually judge the pages.

No blocking issues. No revision cycle.

## Acceptance

The preview in `web/` meets the Milestone 1 scope in `docs/PRODUCT_DIRECTION.md`. Demo listings are labeled, search filters dates by containment, and the listing page says requests are closed and nothing is charged. Research files were left in place.

This is a technical acceptance. It is not founder approval to start Milestone 2.

## Carry forward

These do not block Milestone 1. Do not treat them as permission to expand scope.

1. Date-filter tests miss three regressions the code currently handles, including a reversed pair that extends past the listing window (`web/lib/catalog.test.ts`).
2. `docs/MVP.md` says the data model keeps a city field. `Listing` has no city field.
3. Unknown listing ids render an empty state with HTTP 200.
4. Empty and not-found views use an `h2` and have no `h1`. Listing pages share the generic document title.
5. Photo credits are not recorded next to the Unsplash claim in the footer.
6. No `global-error.tsx`.
7. Co-located tests are not named in a decision entry. `tests/README.md` points at DEC-002, which does not mention tests.
8. Sample host names mix initials and full names.
9. Storage photography and the wide listing-detail column can be tightened in a later visual pass.

## Process note

The designer subagent committed its review on `cursor/m1-design-review-55db` and pushed that branch. That branch is not the integration branch. The review file was brought onto `cursor/milestone-1-shell-aeea`.

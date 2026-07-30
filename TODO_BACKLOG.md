# TODO Backlog

## Critical

- [x] Stop committing secrets/PII: add `backend/database/*.json`, `backend/database/contracts/*`, and any `.env` files to `.gitignore`; propose a plan for scrubbing already-committed PII from git history; add an empty-seed strategy so fresh clones still work.
- [x] Implement real authentication: password hashing migration to bcrypt/argon2, JWT or server-side session issuance at login, `get_current_user` dependency, and role/ownership checks.
- [x] Remove OTP from API responses; wire up a real or clearly stubbed environment-gated email/SMS delivery path.
- [x] Fix the contract file upload endpoints: validate `contract_id`, validate uploaded file MIME type and size, and generate storage filenames server-side.
- [x] Fix CORS configuration: explicit origin allow-list per environment instead of wildcard credentials.

## High

- [ ] Split `main.py` into routers with `APIRouter`; remove duplicate `/api/company/history/{user_id}` route definition.
- [ ] Replace direct JSON-file read/write in every service method with a repository layer and file locking.
- [ ] Offload blocking work from the async event loop.
- [ ] Replace all `Dict[str, Any]` request bodies with Pydantic models.
- [ ] Fix the category-keyword collisions in `analysis_service.py` and add a unit test enumerating every keyword.
- [ ] Set up automated testing and CI.
- [ ] Reconcile documentation with reality or implement the documented Gemini integration.

## Follow-up

- [ ] Review the already-committed JSON data and decide whether a non-destructive migration/export step is needed before any future repository cleanup.

## Medium

- [ ] Remove `frontend/node_modules` from git tracking and verify `.gitignore` prevents recurrence.
- [ ] Standardize on one HTTP client and one routing approach on the frontend.
- [ ] Replace ad-hoc `print()` debug statements with the standard `logging` module.
- [ ] Add pagination to list-returning endpoints.
- [ ] Review and either fix or explicitly document the intentional Savings double-weighting in `scoring_service.py`.
- [ ] Decompose the largest frontend components into smaller pieces and custom hooks.
- [ ] Introduce a small backend config module for host/port/CORS/paths.

## Low

- [ ] Add API versioning prefix with back-compat shim.
- [ ] Add a basic accessibility pass.
- [ ] Verify and fix mobile responsiveness across the custom CSS.
- [ ] Replace hardcoded emoji/risk-level strings in backend responses with a plain enum.
- [ ] Add Docker support as an alternative local-dev path.
- [ ] Add `CONTRIBUTING.md` and a PR template.
- [ ] Replace any real-looking data in test fixtures/sample files with synthetic placeholders.

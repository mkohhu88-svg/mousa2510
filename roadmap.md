# Cloud storage completion
- [x] Diagnose missing workspace and cloud save/load failures.
- [x] Implement reliable company-scoped cloud synchronization with failure recovery.
- [x] Verify real save and read-back in a fresh browser, offline retry, isolated company queues, and existing tests.

# Comprehensive development
- [x] Review current modules, database, authentication and authorization; present and approve a staged plan.
- [x] Add recovery request, dedicated reset route, generic response and invalid/expired-link handling; enable existing email auth idempotently.
- [ ] Verify hosted redirects and actual recovery email/password update — blocked by unavailable settings read and a real approved recovery test.
- [ ] Enforce company features and user permissions in database and server — blocked by explicit rollout choice for shared production backend or isolated test workspace.
- [ ] Add owner feature/company management, safe archival and audit — same production-isolation blocker; search/filter/sort/pagination implemented in current owner page.
- [ ] Complete Arabic RTL/user-management improvements — needs secured management model and owner-session testing after isolation decision.
- [ ] Extend business modules and protect financial integrity — blocked by securing coupled legacy storage in isolated environment first.
- [x] Run 9 unit tests and browser checks for generic recovery response, expired links, mobile/tablet layout and real non-owner admin denial; deliver interim report.
- [ ] Verify owner/company-role flows, feature reactivation/data retention, financial integrity and actual reset completion — blocked by isolated security changes and appropriate authorized test sessions.
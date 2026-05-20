# Requirements: Zenith v3.0 — Task Groomer Plugin

**Defined:** 2026-05-20
**Core Value:** Reduce the friction of developer task management by capturing raw tasks instantly and grooming them with AI evidence from Jira, Confluence, and Google.

## v1 Requirements

### Capture

- [ ] **CAP-01**: Global hotkey (Cmd/Ctrl+Shift+D) opens the capture popup from any Zenith screen within 150ms
- [ ] **CAP-02**: User can type freeform task text and submit with Enter to create a Dump-status task
- [ ] **CAP-03**: On popup open, clipboard content is auto-pasted if it resembles a task (URL, Jira ID, error text)
- [ ] **CAP-04**: Captured task immediately appears in Dumpyard with status "Dump" and creation timestamp

### Dumpyard View

- [ ] **DUMP-01**: Standalone Zenith plugin screen with two sections — Dumpyard (Dump status) and Groomed tasks
- [ ] **DUMP-02**: Task cards show: text, status badge, creation time, stale indicator (≥3 days in Dump)
- [ ] **DUMP-03**: User can change a task's status (Dump / Groomed / Done / Delegated / Aborted) from the card
- [ ] **DUMP-04**: Tasks stale in Dump for 3+ days show a distinct visual stale indicator

### AI Grooming

- [x] **GROOM-01**: AI grooming agent runs at a user-configured scheduled time (e.g. 9am daily)
- [x] **GROOM-02**: AI grooming can be triggered manually at any time from the plugin screen
- [x] **GROOM-03**: Per task, AI produces: priority score (P1/P2/P3), suggested action (do/delegate/defer/delete), linked Jira ticket (if found), evidence summary
- [x] **GROOM-04**: For research-mode tasks (complex/ambiguous), AI produces a mini-summary with relevant links from Google, Confluence, and Jira plus a suggested next-step roadmap
- [ ] **GROOM-05**: User can trigger "Re-groom" on any task to get fresh AI analysis
- [ ] **GROOM-06**: After each grooming run, a digest view shows all newly groomed tasks in priority order

### Integrations

- [ ] **INT-01**: Jira: query related tickets as evidence for task enrichment (read-only during grooming)
- [ ] **INT-02**: Confluence: pull relevant pages as evidence context
- [ ] **INT-03**: Google: search for relevant docs/links for research-mode tasks
- [ ] **INT-04**: Jira push: single-button "Create Jira ticket" action on any groomed task

### Data & Storage

- [x] **TDATA-01**: Tasks persist in tasks.db (SQLite), survive app restart
- [x] **TDATA-02**: Grooming schedule (time, enabled) persists in electron-store and is configurable in Settings
- [ ] **TDATA-03**: Integration credentials (Jira token, Confluence token, Google API key) stored encrypted via safeStorage

## v2 Requirements

### Extended Integrations

- **SLACK-01**: Slack: pull relevant thread context as evidence source
- **GCAL-01**: Google Calendar: offer to block time for P1 groomed tasks

### Notifications

- **NOTIF-01**: After scheduled grooming run, send in-app notification with digest summary
- **NOTIF-02**: Email digest option: send groomed task list to user's email

### Smart Capture

- **SMART-01**: Natural language date parsing ("by EOW", "urgent") extracted from task text during grooming

## Out of Scope

| Feature | Reason |
|---------|--------|
| Two-way Jira sync | Push-on-click is sufficient for v1; bidirectional adds complexity |
| Team sharing / multi-user | Personal task tool for v1 |
| Mobile/web access | Electron-first |
| Light mode | Dark-only app |
| AI chat on tasks | Grooming produces structured output; freeform chat deferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAP-01 | Phase 15 | Pending |
| CAP-02 | Phase 15 | Pending |
| CAP-03 | Phase 15 | Pending |
| CAP-04 | Phase 15 | Pending |
| DUMP-01 | Phase 16 | Pending |
| DUMP-02 | Phase 16 | Pending |
| DUMP-03 | Phase 16 | Pending |
| DUMP-04 | Phase 16 | Pending |
| GROOM-01 | Phase 18 | Complete |
| GROOM-02 | Phase 18 | Complete |
| GROOM-03 | Phase 18 | Complete |
| GROOM-04 | Phase 18 | Complete |
| GROOM-05 | Phase 19 | Pending |
| GROOM-06 | Phase 19 | Pending |
| INT-01 | Phase 17 | Pending |
| INT-02 | Phase 17 | Pending |
| INT-03 | Phase 17 | Pending |
| INT-04 | Phase 20 | Pending |
| TDATA-01 | Phase 14 | Complete |
| TDATA-02 | Phase 20 | Complete |
| TDATA-03 | Phase 17 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after v3.0 milestone start*

# A-krav Traceability Matrix

Municipal Ticketing Platform — DigiList / Hamar Kulturhus

| A-krav | Description | Test IDs | Suite | App | Evidence Type |
|--------|-------------|----------|-------|-----|---------------|
| **A-1: Roles & Access** | | | **A** | | |
| A-1.1 | Admin can create/edit events, pricing, seat maps | RBAC-001, RBAC-002 | A | backoffice | Screenshot |
| A-1.2 | Counter role: sell + check-in, no pricing | RBAC-003, RBAC-004 | A | backoffice | Screenshot |
| A-1.3 | Finance role: reports + export, no event edit | RBAC-005, RBAC-006 | A | backoffice | Screenshot |
| A-1.4 | Regular user cannot access admin routes | RBAC-007 | A | backoffice | Screenshot |
| A-1.5 | Guest can browse, login required at checkout | RBAC-008 | A | web | Screenshot |
| A-1.6 | Audit log records sensitive admin actions | RBAC-009 | A | backoffice | JSON export |
| **A-2: Events & Publishing** | | | **B** | | |
| A-2.1 | Create multi-date performance set | EVT-001 | B | backoffice | Screenshot |
| A-2.2 | Event invisible before publishAt | EVT-002 | B | web | Screenshot |
| A-2.3 | Published event visible | EVT-003 | B | web | Screenshot |
| A-2.3b | Presale gated by membership | EVT-004, EVT-005 | B | web | Screenshot |
| A-2.4 | Sales open/close at configured times | EVT-006 | B | web | Screenshot |
| A-2.5 | Cancel performance notifies holders | EVT-007 | B | backoffice | Screenshot |
| A-2.6 | Duplicate performance copies config | EVT-008 | B | backoffice | Screenshot |
| **A-3: Inventory & Seats** | | | **C** | | |
| A-3.1 | Seat map renders with sections | SEAT-001 | C | web | Screenshot |
| A-3.2 | Seat hold locks for other sessions | SEAT-002 | C | API | JSON |
| A-3.3 | Cart hold expires after TTL | SEAT-003 | C | API | JSON |
| A-3.4 | Concurrent buyers: one wins, one sold-out | SEAT-004 | C | API | JSON |
| A-3.5 | "Få billetter igjen" at threshold | SEAT-005 | C | web | Screenshot |
| A-3.6 | Sold out blocks purchase | SEAT-006 | C | web | Screenshot |
| A-3.7 | GA section tracks count correctly | SEAT-007 | C | API | JSON |
| **A-4: Checkout & Payments** | | | **D** | | |
| A-4.1 | Vipps payment → confirmed → tickets issued | PAY-001 | D | web | Screenshot |
| A-4.2 | Card payment (Adyen) → same flow | PAY-002 | D | web | Screenshot |
| A-4.3 | Payment failure → pending, retry works | PAY-003 | D | web | Screenshot |
| A-4.4 | Webhook replay idempotent | PAY-004 | D | API | JSON |
| A-4.5 | Discount code applied correctly | PAY-005 | D | web | Screenshot |
| A-4.6 | Membership discount auto-applied | PAY-006 | D | web | Screenshot |
| A-4.7 | Mixed payment: gift card + Vipps | PAY-007 | D | web | Screenshot |
| A-4.8 | Invoice payment creates invoice | PAY-008 | D | web | Screenshot |
| A-4.9 | Full refund → tickets cancelled | PAY-009 | D | backoffice | Screenshot |
| A-4.10 | Partial refund: single item | PAY-010 | D | backoffice | Screenshot |
| **A-5: Gift Cards** | | | **E** | | |
| A-5.1 | Purchase gift card → balance | GC-001 | E | web | Screenshot |
| A-5.2 | Partial redeem → remaining balance | GC-002 | E | API | JSON |
| A-5.3 | Invalid code → clear error | GC-003 | E | web | Screenshot |
| A-5.4 | Refund restores balance | GC-004 | E | API | JSON |
| A-5.5 | Block/unblock card (fraud) | GC-005 | E | backoffice | Screenshot |
| A-5.6 | Batch creation (admin) | GC-006 | E | backoffice | Screenshot |
| A-5.7 | Physical card activation by barcode | GC-007 | E | backoffice | Screenshot |
| **A-6: Membership** | | | **F** | | |
| A-6.1 | View tiers and subscribe | MEM-001 | F | web/minside | Screenshot |
| A-6.2 | Member sees presale inventory | MEM-002 | F | web | Screenshot |
| A-6.3 | Pricing group discount auto-applied | MEM-003 | F | web | Screenshot |
| A-6.4 | Cancel membership → benefits removed | MEM-004 | F | minside | Screenshot |
| A-6.5 | Pause/resume membership | MEM-005 | F | minside | Screenshot |
| A-6.6 | Benefit usage tracking | MEM-006 | F | minside | Screenshot |
| **A-7: Resale & Transfer** | | | **G** | | |
| A-7.1 | Transfer ticket: original invalidated | RSL-001 | G | minside | Screenshot |
| A-7.2 | Create resale listing → ticket locked | RSL-002 | G | minside | Screenshot |
| A-7.3 | Buyer purchases resale | RSL-003 | G | web | Screenshot |
| A-7.4 | Scan: only latest ticket valid | RSL-004 | G | API | JSON |
| A-7.5 | Report dispute | RSL-005 | G | minside | Screenshot |
| A-7.6 | Admin resolves dispute | RSL-006 | G | backoffice | Screenshot |
| A-7.7 | Price limits enforced | RSL-007 | G | minside | Screenshot |
| **A-8: Scanning / Entry Control** | | | **H** | | |
| A-8.1 | Scan valid ticket → accepted | SCN-001 | H | backoffice | Screenshot |
| A-8.2 | Duplicate scan → rejected | SCN-002 | H | backoffice | Screenshot |
| A-8.3 | Refunded ticket scan → rejected | SCN-003 | H | backoffice | Screenshot |
| A-8.4 | Manual entry by ticket number | SCN-004 | H | backoffice | Screenshot |
| A-8.5 | Override check-in (admin only) | SCN-005 | H | backoffice | Screenshot |
| A-8.6 | Undo check-in | SCN-006 | H | backoffice | Screenshot |
| A-8.7 | Check-in stats real-time | SCN-007 | H | backoffice | Screenshot |
| A-8.8 | Burst scan: 50 rapid scans | SCN-008 | H | API | JSON |
| **A-9: Reporting & Export** | | | **I** | | |
| A-9.1 | Revenue report by ticket type | RPT-001 | I | backoffice | Screenshot + CSV |
| A-9.2 | Sell-through rate per performance | RPT-002 | I | backoffice | Screenshot |
| A-9.3 | Cancellation report by date range | RPT-003 | I | backoffice | Screenshot |
| A-9.4 | Presale vs general sale breakdown | RPT-004 | I | backoffice | Screenshot |
| A-9.5 | CSV export matches UI totals | RPT-005 | I | backoffice | CSV |
| A-9.6 | Reconciliation: orders ↔ payments | RPT-006 | I | API | JSON |
| A-9.7 | Membership usage impact report | RPT-007 | I | backoffice | Screenshot |
| **A-10: Channels** | | | **J** | | |
| A-10.1 | Web purchase tagged channel=web | CHN-001 | J | web | JSON |
| A-10.2 | Counter purchase tagged channel=counter | CHN-002 | J | backoffice | JSON |
| A-10.3 | API purchase tagged channel=api | CHN-003 | J | API | JSON |
| **A-11: Accessibility** | | | **K** | | |
| A-11.1 | Event listing: zero axe violations | A11Y-001 | K | web | Axe JSON |
| A-11.2 | Event detail: zero axe violations | A11Y-002 | K | web | Axe JSON |
| A-11.3 | Seat selection: zero axe violations | A11Y-003 | K | web | Axe JSON |
| A-11.4 | Checkout: zero axe violations | A11Y-004 | K | web | Axe JSON |
| A-11.5 | Order confirmation: zero axe violations | A11Y-005 | K | web | Axe JSON |
| A-11.6 | Keyboard-only: complete purchase flow | A11Y-006 | K | web | JSON |
| A-11.7 | Screen reader: headings and landmarks | A11Y-007 | K | web | JSON |

## Summary

- **11 domains**, **68 test cases**
- **Suites**: A (RBAC), B (Events), C (Inventory), D (Checkout), E (Gift Cards), F (Membership), G (Resale), H (Scanning), I (Reporting), J (Channels), K (Accessibility)
- **Apps tested**: web, backoffice, minside
- **Evidence types**: Screenshots, Videos, Axe JSON, CSV exports, Audit log JSON, Reconciliation JSON

## Running

```bash
# Full suite
pnpm test:e2e:a-krav

# Single suite
pnpm exec playwright test --project=a-krav tests/e2e/a-krav/suite-d-checkout-payments.spec.ts

# Smoke subset (PR)
pnpm test:e2e:a-krav:smoke

# Generate evidence pack
npx tsx scripts/export-evidence-pack.ts
```

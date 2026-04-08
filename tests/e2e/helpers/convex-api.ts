/**
 * Direct Convex API helpers for E2E tests.
 *
 * Calls Convex functions directly via `npx convex run` for test setup,
 * assertions, and backend-only test scenarios.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Run a Convex query/mutation and return the parsed JSON result. */
export async function convexRun<T = unknown>(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    const argsJson = JSON.stringify(args);
    const { stdout } = await execAsync(
      `npx convex run '${functionPath}' '${argsJson}'`,
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: "test" },
        timeout: 30_000,
      }
    );
    const trimmed = stdout.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
    return JSON.parse(trimmed) as T;
  } catch (error) {
    console.warn(`convexRun(${functionPath}) failed:`, error);
    return null;
  }
}

/** Run a Convex mutation (same as convexRun but semantically clearer). */
export async function convexMutate<T = unknown>(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<T | null> {
  return convexRun<T>(functionPath, args);
}

// ---------------------------------------------------------------------------
// Domain-specific helpers
// ---------------------------------------------------------------------------

export const E2E_TENANT_ID = "qd71nzdbvssrm2n3n2018daspx81pftx";
/** @deprecated Use E2E_TENANT_ID instead */
export const HAMAR_TENANT_ID = E2E_TENANT_ID;

/** Get tenant by slug. */
export async function getTenant(slug: string) {
  return convexRun<{ _id: string; name: string; slug: string }>(
    "tenants/index:getBySlug",
    { slug }
  );
}

/** List performances for a tenant. */
export async function listPerformances(tenantId: string) {
  return convexRun<Array<Record<string, unknown>>>(
    "domain/ticketing:listPerformances",
    { tenantId }
  );
}

/** Get a single performance. */
export async function getPerformance(tenantId: string, performanceId: string) {
  return convexRun<Record<string, unknown>>(
    "domain/ticketing:getPerformance",
    { tenantId, performanceId }
  );
}

/** Create an order via facade. */
export async function createOrder(args: {
  tenantId: string;
  customerId: string;
  channel?: string;
}) {
  return convexRun<{ orderId: string; orderNumber: string }>(
    "domain/orders:createOrder",
    { channel: "api", ...args }
  );
}

/** Simulate a payment callback (mock payment). */
export async function handlePaymentCallback(args: {
  tenantId: string;
  orderId: string;
  paymentId: string;
  provider: string;
  status: string;
  amount: number;
}) {
  return convexRun("domain/checkout:handlePaymentCallback", args);
}

/** Get order details. */
export async function getOrder(tenantId: string, orderId: string) {
  return convexRun<Record<string, unknown>>("domain/orders:getOrder", {
    tenantId,
    orderId,
  });
}

/** List tickets for a performance. */
export async function listTickets(tenantId: string, performanceId: string) {
  return convexRun<Array<Record<string, unknown>>>(
    "domain/tickets:listTickets",
    { tenantId, performanceId }
  );
}

/** Get ticket by barcode. */
export async function getTicketByBarcode(tenantId: string, barcode: string) {
  return convexRun<Record<string, unknown>>(
    "domain/tickets:getTicketByBarcode",
    { tenantId, barcode }
  );
}

/** Mark a ticket as used (check-in). */
export async function markTicketAsUsed(args: {
  tenantId: string;
  ticketId: string;
  checkedInBy: string;
}) {
  return convexRun("domain/tickets:markTicketAsUsed", args);
}

/** Get check-in stats for a performance. */
export async function getCheckInStats(
  tenantId: string,
  performanceId: string
) {
  return convexRun<Record<string, unknown>>(
    "domain/ticketing:getPerformanceAvailability",
    { tenantId, performanceId }
  );
}

/** Create a gift card. */
export async function createGiftCard(args: {
  tenantId: string;
  code: string;
  initialBalance: number;
  type?: string;
  createdBy: string;
}) {
  return convexRun("domain/giftcards:createGiftCard", {
    type: "digital",
    ...args,
  });
}

/** Get gift card balance. */
export async function getGiftCardBalance(tenantId: string, code: string) {
  return convexRun<{ balance: number; status: string }>(
    "domain/giftcards:getGiftCardBalance",
    { tenantId, code }
  );
}

/** Create a resale listing. */
export async function createResaleListing(args: {
  tenantId: string;
  ticketId: string;
  sellerId: string;
  askingPrice: number;
}) {
  return convexRun("domain/resale:createResaleListing", args);
}

/** List audit log entries. */
export async function listAuditEntries(
  tenantId: string,
  options?: { entityType?: string; limit?: number }
) {
  return convexRun<Array<Record<string, unknown>>>(
    "domain/audit:listForTenant",
    { tenantId, ...options }
  );
}

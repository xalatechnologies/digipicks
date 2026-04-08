import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/economy — invoice basis + credit notes", () => {
    function setup() {
        return createDomainTest(["billing", "audit"]);
    }

    const DAY = 86_400_000;

    // =========================================================================
    // INVOICE BASIS LIFECYCLE
    // =========================================================================

    describe("createInvoiceBasis", () => {
        it("creates a draft invoice basis with computed totals", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [
                    { description: "Room booking", quantity: 2, unitPrice: 500, vatRate: 25 },
                    { description: "Equipment", quantity: 1, unitPrice: 200 },
                ],
                dueDate: Date.now() + 30 * DAY,
                notes: "Test invoice basis",
            });

            expect(result.id).toBeDefined();

            // Verify via component query
            const basis = await t.query(components.billing.queries.getInvoiceBasis, {
                id: result.id as any,
            });
            expect(basis.status).toBe("draft");
            expect(basis.totalAmount).toBe(1200); // 2*500 + 1*200
            expect(basis.vatAmount).toBe(250);     // 2*500*25% = 250
            expect(basis.currency).toBe("NOK");
            expect(basis.notes).toBe("Test invoice basis");
        });
    });

    describe("updateInvoiceBasis", () => {
        it("updates line items and recomputes totals", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "Original", quantity: 1, unitPrice: 100 }],
                dueDate: Date.now() + 30 * DAY,
            });

            await t.mutation(api.domain.billing.updateInvoiceBasis, {
                id,
                lineItems: [
                    { description: "Updated", quantity: 3, unitPrice: 300, vatRate: 25 },
                ],
                notes: "Updated notes",
            });

            const basis = await t.query(components.billing.queries.getInvoiceBasis, {
                id: id as any,
            });
            expect(basis.totalAmount).toBe(900);  // 3*300
            expect(basis.vatAmount).toBe(225);     // 900*25%
            expect(basis.notes).toBe("Updated notes");
        });

        it("rejects update on non-draft basis", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "Test", quantity: 1, unitPrice: 100 }],
                dueDate: Date.now() + 30 * DAY,
            });

            // Approve the basis
            await t.mutation(api.domain.billing.approveInvoiceBasis, { id });

            // Try to update — should fail
            await expect(
                t.mutation(api.domain.billing.updateInvoiceBasis, {
                    id,
                    notes: "Should fail",
                })
            ).rejects.toThrow("Only draft invoice bases can be updated");
        });
    });

    describe("approveInvoiceBasis", () => {
        it("transitions draft -> approved", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "Test", quantity: 1, unitPrice: 500 }],
                dueDate: Date.now() + 30 * DAY,
            });

            const result = await t.mutation(api.domain.billing.approveInvoiceBasis, { id });
            expect(result.success).toBe(true);

            const basis = await t.query(components.billing.queries.getInvoiceBasis, {
                id: id as any,
            });
            expect(basis.status).toBe("approved");
        });

        it("rejects approval of non-draft basis", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "Test", quantity: 1, unitPrice: 500 }],
                dueDate: Date.now() + 30 * DAY,
            });

            await t.mutation(api.domain.billing.approveInvoiceBasis, { id });

            await expect(
                t.mutation(api.domain.billing.approveInvoiceBasis, { id })
            ).rejects.toThrow("Only draft invoice bases can be approved");
        });
    });

    describe("finalizeInvoiceBasis", () => {
        it("creates a sales document and transitions to finalized", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [
                    { description: "Booking", quantity: 1, unitPrice: 1000, vatRate: 25 },
                ],
                dueDate: Date.now() + 30 * DAY,
            });

            await t.mutation(api.domain.billing.approveInvoiceBasis, { id });

            const result = await t.mutation(api.domain.billing.finalizeInvoiceBasis, {
                id,
                sendToCustomer: false,
            });

            expect(result.success).toBe(true);
            expect(result.salesDocumentId).toBeDefined();

            // Verify basis is finalized
            const basis = await t.query(components.billing.queries.getInvoiceBasis, {
                id: id as any,
            });
            expect(basis.status).toBe("finalized");
            expect(basis.salesDocumentId).toBe(result.salesDocumentId);

            // Verify invoice was created
            const invoice = await t.query(components.billing.queries.getInvoice, {
                id: result.salesDocumentId as any,
            });
            expect(invoice).toBeDefined();
            expect(invoice.status).toBe("draft");
            expect(invoice.totalAmount).toBe(1250); // 1000 + 250 VAT
        });

        it("rejects finalization of non-approved basis", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "Test", quantity: 1, unitPrice: 500 }],
                dueDate: Date.now() + 30 * DAY,
            });

            await expect(
                t.mutation(api.domain.billing.finalizeInvoiceBasis, { id })
            ).rejects.toThrow("Only approved invoice bases can be finalized");
        });
    });

    describe("deleteInvoiceBasis", () => {
        it("soft-deletes a draft basis", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "Test", quantity: 1, unitPrice: 100 }],
                dueDate: Date.now() + 30 * DAY,
            });

            const result = await t.mutation(api.domain.billing.deleteInvoiceBasis, { id });
            expect(result.success).toBe(true);

            const basis = await t.query(components.billing.queries.getInvoiceBasis, {
                id: id as any,
            });
            expect(basis.status).toBe("deleted");
        });

        it("rejects deletion of non-draft basis", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "Test", quantity: 1, unitPrice: 100 }],
                dueDate: Date.now() + 30 * DAY,
            });

            await t.mutation(api.domain.billing.approveInvoiceBasis, { id });

            await expect(
                t.mutation(api.domain.billing.deleteInvoiceBasis, { id })
            ).rejects.toThrow("Only draft invoice bases can be deleted");
        });
    });

    describe("listInvoiceBases", () => {
        it("lists bases for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "A", quantity: 1, unitPrice: 100 }],
                dueDate: Date.now() + 30 * DAY,
            });
            await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-002",
                lineItems: [{ description: "B", quantity: 1, unitPrice: 200 }],
                dueDate: Date.now() + 30 * DAY,
            });

            const results = await t.query(api.domain.billing.listInvoiceBases, {
                tenantId,
            });

            expect(results.length).toBe(2);
        });

        it("filters by status", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-001",
                lineItems: [{ description: "A", quantity: 1, unitPrice: 100 }],
                dueDate: Date.now() + 30 * DAY,
            });
            await t.mutation(api.domain.billing.approveInvoiceBasis, { id });

            await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-002",
                lineItems: [{ description: "B", quantity: 1, unitPrice: 200 }],
                dueDate: Date.now() + 30 * DAY,
            });

            const drafts = await t.query(api.domain.billing.listInvoiceBases, {
                tenantId,
                status: "draft",
            });
            expect(drafts.length).toBe(1);

            const approved = await t.query(api.domain.billing.listInvoiceBases, {
                tenantId,
                status: "approved",
            });
            expect(approved.length).toBe(1);
        });
    });

    // =========================================================================
    // CREDIT NOTE LIFECYCLE
    // =========================================================================

    describe("createCreditNote", () => {
        it("creates a credit note for a sales document with line items", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            // First create an invoice to credit
            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                lineItems: [{
                    id: "li-1",
                    description: "Room",
                    quantity: 1,
                    unitPrice: 1000,
                    amount: 1000,
                    taxRate: 25,
                    taxAmount: 250,
                }],
                customerName: "Test",
                dueDate: Date.now() + 30 * DAY,
            });

            const result = await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Customer complaint",
                lineItems: [
                    { description: "Room refund", quantity: 1, unitPrice: 1000, vatRate: 25 },
                ],
            });

            expect(result.id).toBeDefined();
            expect(result.creditNoteNumber).toMatch(/^CN-\d{4}-\d{4}$/);

            const note = await t.query(components.billing.queries.getCreditNote, {
                id: result.id as any,
            });
            expect(note.status).toBe("draft");
            expect(note.reason).toBe("Customer complaint");
            expect(note.totalAmount).toBe(1250); // 1000 + 250 VAT
        });
    });

    describe("approveCreditNote", () => {
        it("transitions draft -> approved", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                lineItems: [{
                    id: "li-1", description: "Room", quantity: 1,
                    unitPrice: 500, amount: 500,
                }],
                customerName: "Test",
                dueDate: Date.now() + 30 * DAY,
            });

            const { id } = await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Overcharge",
                lineItems: [{ description: "Refund", quantity: 1, unitPrice: 500 }],
            });

            const result = await t.mutation(api.domain.billing.approveCreditNote, { id });
            expect(result.success).toBe(true);

            const note = await t.query(components.billing.queries.getCreditNote, {
                id: id as any,
            });
            expect(note.status).toBe("approved");
            expect(note.issuedAt).toBeGreaterThan(0);
        });

        it("rejects approval of non-draft note", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                lineItems: [{
                    id: "li-1", description: "Room", quantity: 1,
                    unitPrice: 500, amount: 500,
                }],
                customerName: "Test",
                dueDate: Date.now() + 30 * DAY,
            });

            const { id } = await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Overcharge",
                lineItems: [{ description: "Refund", quantity: 1, unitPrice: 500 }],
            });

            await t.mutation(api.domain.billing.approveCreditNote, { id });

            await expect(
                t.mutation(api.domain.billing.approveCreditNote, { id })
            ).rejects.toThrow("Only draft credit notes can be approved");
        });
    });

    describe("processCreditNote", () => {
        it("transitions approved -> processed", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                lineItems: [{
                    id: "li-1", description: "Room", quantity: 1,
                    unitPrice: 500, amount: 500,
                }],
                customerName: "Test",
                dueDate: Date.now() + 30 * DAY,
            });

            const { id } = await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Cancellation",
                lineItems: [{ description: "Refund", quantity: 1, unitPrice: 500 }],
            });

            await t.mutation(api.domain.billing.approveCreditNote, { id });
            const result = await t.mutation(api.domain.billing.processCreditNote, { id });
            expect(result.success).toBe(true);

            const note = await t.query(components.billing.queries.getCreditNote, {
                id: id as any,
            });
            expect(note.status).toBe("processed");
            expect(note.processedAt).toBeGreaterThan(0);
        });

        it("rejects processing of non-approved note", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                lineItems: [{
                    id: "li-1", description: "Room", quantity: 1,
                    unitPrice: 500, amount: 500,
                }],
                customerName: "Test",
                dueDate: Date.now() + 30 * DAY,
            });

            const { id } = await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Cancellation",
                lineItems: [{ description: "Refund", quantity: 1, unitPrice: 500 }],
            });

            await expect(
                t.mutation(api.domain.billing.processCreditNote, { id })
            ).rejects.toThrow("Only approved credit notes can be processed");
        });
    });

    describe("listCreditNotes", () => {
        it("lists credit notes for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                lineItems: [{
                    id: "li-1", description: "Room", quantity: 1,
                    unitPrice: 500, amount: 500,
                }],
                customerName: "Test",
                dueDate: Date.now() + 30 * DAY,
            });

            await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Reason A",
                lineItems: [{ description: "Refund A", quantity: 1, unitPrice: 300 }],
            });

            await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Reason B",
                lineItems: [{ description: "Refund B", quantity: 1, unitPrice: 200 }],
            });

            const results = await t.query(api.domain.billing.listCreditNotes, {
                tenantId,
            });

            expect(results.length).toBe(2);
        });

        it("filters by status", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                lineItems: [{
                    id: "li-1", description: "Room", quantity: 1,
                    unitPrice: 500, amount: 500,
                }],
                customerName: "Test",
                dueDate: Date.now() + 30 * DAY,
            });

            const { id } = await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Reason A",
                lineItems: [{ description: "Refund", quantity: 1, unitPrice: 300 }],
            });
            await t.mutation(api.domain.billing.approveCreditNote, { id });

            await t.mutation(api.domain.billing.createCreditNote, {
                tenantId,
                salesDocumentId: invoiceId,
                reason: "Reason B",
                lineItems: [{ description: "Refund", quantity: 1, unitPrice: 200 }],
            });

            const drafts = await t.query(api.domain.billing.listCreditNotes, {
                tenantId,
                status: "draft",
            });
            expect(drafts.length).toBe(1);

            const approved = await t.query(api.domain.billing.listCreditNotes, {
                tenantId,
                status: "approved",
            });
            expect(approved.length).toBe(1);
        });
    });

    // =========================================================================
    // FULL LIFECYCLE: Invoice Basis → Finalize → Credit Note
    // =========================================================================

    describe("full economy lifecycle", () => {
        it("creates basis, finalizes to invoice, then credits", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            // Step 1: Create invoice basis
            const { id: basisId } = await t.mutation(api.domain.billing.createInvoiceBasis, {
                tenantId,
                customerId: "customer-lifecycle",
                lineItems: [
                    { description: "Conference room", quantity: 2, unitPrice: 750, vatRate: 25 },
                ],
                dueDate: Date.now() + 14 * DAY,
            });

            // Step 2: Approve
            await t.mutation(api.domain.billing.approveInvoiceBasis, { id: basisId });

            // Step 3: Finalize → creates invoice
            const { salesDocumentId } = await t.mutation(api.domain.billing.finalizeInvoiceBasis, {
                id: basisId,
                sendToCustomer: true,
            });

            // Verify invoice
            const invoice = await t.query(components.billing.queries.getInvoice, {
                id: salesDocumentId as any,
            });
            expect(invoice.status).toBe("sent");
            expect(invoice.totalAmount).toBe(1875); // 1500 + 375 VAT

            // Step 4: Create credit note
            const { id: creditNoteId, creditNoteNumber } = await t.mutation(
                api.domain.billing.createCreditNote,
                {
                    tenantId,
                    salesDocumentId,
                    reason: "Event cancelled",
                    lineItems: [
                        { description: "Conference room refund", quantity: 2, unitPrice: 750, vatRate: 25 },
                    ],
                }
            );

            expect(creditNoteNumber).toMatch(/^CN-/);

            // Step 5: Approve credit note
            await t.mutation(api.domain.billing.approveCreditNote, { id: creditNoteId });

            // Step 6: Process credit note
            await t.mutation(api.domain.billing.processCreditNote, { id: creditNoteId });

            const processedNote = await t.query(components.billing.queries.getCreditNote, {
                id: creditNoteId as any,
            });
            expect(processedNote.status).toBe("processed");
            expect(processedNote.processedAt).toBeGreaterThan(0);
        });
    });
});

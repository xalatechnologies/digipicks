/**
 * Vitest global setup for Convex function tests.
 *
 * The convex-test framework (DatabaseFake) fires scheduled functions and
 * other async writes after mutation transactions complete. These produce
 * "Write outside of transaction" and "Transaction already committed"
 * unhandled rejections that are framework limitations, not real bugs.
 *
 * In production Convex, scheduled functions run in separate transactions.
 * We suppress these specific errors to keep test output clean and prevent
 * cascade failures.
 */

if (typeof process !== "undefined") {
    process.on("unhandledRejection", (reason: unknown) => {
        if (reason instanceof Error) {
            // Suppress all convex-test DatabaseFake transaction errors
            if (reason.message.includes("Write outside of transaction")) {
                return;
            }
            if (reason.message.includes("Transaction already committed or rolled back")) {
                return;
            }
            // Component not registered in test environment — expected
            if (reason.message.includes("is not registered. Call")) {
                return;
            }
        }
        // Re-throw unexpected rejections
        throw reason;
    });
}

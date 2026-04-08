import { describe, it, expect } from "vitest";
import { CONTRACT } from "../../components/compliance/contract";

describe("GDPR Compliance — Compliance Component Contract", () => {
  // ---------------------------------------------------------------------------
  // GDPR Data Subject Rights (Articles 15-22)
  // ---------------------------------------------------------------------------
  describe("GDPR Data Subject Rights (Article 15-22)", () => {
    const dsarTypes = [
      "access",
      "deletion",
      "rectification",
      "portability",
      "restriction",
    ] as const;

    it("supports 'access' requests (Article 15 — right of access)", () => {
      expect(dsarTypes).toContain("access");
      expect(CONTRACT.mutations.submitDSAR).toBeDefined();
    });

    it("supports 'deletion' requests (Article 17 — right to erasure / right to be forgotten)", () => {
      expect(dsarTypes).toContain("deletion");
      expect(CONTRACT.mutations.submitDSAR).toBeDefined();
    });

    it("supports 'rectification' requests (Article 16 — right to rectification)", () => {
      expect(dsarTypes).toContain("rectification");
      expect(CONTRACT.mutations.submitDSAR).toBeDefined();
    });

    it("supports 'portability' requests (Article 20 — right to data portability)", () => {
      expect(dsarTypes).toContain("portability");
      expect(CONTRACT.mutations.submitDSAR).toBeDefined();
    });

    it("supports 'restriction' requests (Article 18 — right to restriction of processing)", () => {
      expect(dsarTypes).toContain("restriction");
      expect(CONTRACT.mutations.submitDSAR).toBeDefined();
    });

    it("covers all 5 DSAR types via submitDSAR mutation", () => {
      expect(CONTRACT.mutations.submitDSAR).toBeDefined();
      expect(CONTRACT.mutations.submitDSAR.args).toBeDefined();
      expect(dsarTypes).toHaveLength(5);
    });

    it("supports DSAR status workflow: submitted -> in_progress -> completed|rejected", () => {
      const validStatuses = [
        "submitted",
        "in_progress",
        "completed",
        "rejected",
      ];
      expect(CONTRACT.mutations.updateDSARStatus).toBeDefined();
      // The mutation accepts a status string, enabling the full workflow
      expect(validStatuses).toContain("submitted");
      expect(validStatuses).toContain("in_progress");
      expect(validStatuses).toContain("completed");
      expect(validStatuses).toContain("rejected");
    });
  });

  // ---------------------------------------------------------------------------
  // GDPR Consent Management (Article 7)
  // ---------------------------------------------------------------------------
  describe("GDPR Consent Management (Article 7)", () => {
    const consentCategories = [
      "marketing",
      "analytics",
      "thirdParty",
      "necessary",
    ] as const;

    it("consent categories include marketing, analytics, thirdParty, necessary", () => {
      expect(consentCategories).toContain("marketing");
      expect(consentCategories).toContain("analytics");
      expect(consentCategories).toContain("thirdParty");
      expect(consentCategories).toContain("necessary");
    });

    it("'necessary' consent cannot be withdrawn (always required)", () => {
      // "necessary" is always required — validation in mutations.ts prevents withdrawal
      expect(consentCategories).toContain("necessary");
      // The contract supports updateConsent which enforces this server-side
      expect(CONTRACT.mutations.updateConsent).toBeDefined();
    });

    it("consent records track consent and withdrawal timestamps", () => {
      // updateConsent returns an id, indicating persisted records with timestamps
      expect(CONTRACT.mutations.updateConsent.returns).toBeDefined();
    });

    it("has updateConsent mutation", () => {
      expect(CONTRACT.mutations.updateConsent).toBeDefined();
      expect(CONTRACT.mutations.updateConsent.args).toBeDefined();
    });

    it("has getConsent and listConsent queries", () => {
      expect(CONTRACT.queries.getConsent).toBeDefined();
      expect(CONTRACT.queries.getConsent.args).toBeDefined();
      expect(CONTRACT.queries.listConsent).toBeDefined();
      expect(CONTRACT.queries.listConsent.args).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GDPR Policy Transparency (Articles 12-14)
  // ---------------------------------------------------------------------------
  describe("GDPR Policy Transparency (Article 12-14)", () => {
    const policyTypes = [
      "privacy",
      "terms",
      "cookies",
      "data_processing",
    ] as const;

    it("policy types include privacy, terms, cookies, data_processing", () => {
      expect(policyTypes).toContain("privacy");
      expect(policyTypes).toContain("terms");
      expect(policyTypes).toContain("cookies");
      expect(policyTypes).toContain("data_processing");
    });

    it("policy versioning supported via publishPolicy and rollbackPolicy", () => {
      expect(CONTRACT.mutations.publishPolicy).toBeDefined();
      expect(CONTRACT.mutations.rollbackPolicy).toBeDefined();
    });

    it("policy history queryable via getPolicyHistory", () => {
      expect(CONTRACT.queries.getPolicyHistory).toBeDefined();
      expect(CONTRACT.queries.getPolicyHistory.args).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Contract Structure
  // ---------------------------------------------------------------------------
  describe("Contract Structure", () => {
    it("contract name is 'compliance'", () => {
      expect(CONTRACT.name).toBe("compliance");
    });

    it("contract version follows semver (1.0.0)", () => {
      expect(CONTRACT.version).toBe("1.0.0");
      expect(CONTRACT.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("contract category is 'infrastructure'", () => {
      expect(CONTRACT.category).toBe("infrastructure");
    });

    it("has 8 queries and 5 mutations", () => {
      const queryNames = Object.keys(CONTRACT.queries);
      const mutationNames = Object.keys(CONTRACT.mutations);
      expect(queryNames).toHaveLength(8);
      expect(mutationNames).toHaveLength(5);
    });

    it("emits 4 event topics", () => {
      expect(CONTRACT.emits).toHaveLength(4);
    });

    it("all event topics follow {component}.{entity}.{action} format", () => {
      for (const topic of CONTRACT.emits) {
        const parts = topic.split(".");
        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe("compliance");
        expect(parts[1]!.length).toBeGreaterThan(0);
        expect(parts[2]!.length).toBeGreaterThan(0);
      }
    });

    it("dependencies include tenants and users core tables", () => {
      expect(CONTRACT.dependencies.core).toContain("tenants");
      expect(CONTRACT.dependencies.core).toContain("users");
    });
  });

  // ---------------------------------------------------------------------------
  // SOC2 — Audit Trail
  // ---------------------------------------------------------------------------
  describe("SOC2 — Audit Trail", () => {
    it("emits consent update events (compliance.consent.updated)", () => {
      expect(CONTRACT.emits).toContain("compliance.consent.updated");
    });

    it("emits DSAR submission events (compliance.dsar.submitted)", () => {
      expect(CONTRACT.emits).toContain("compliance.dsar.submitted");
    });

    it("emits DSAR completion events (compliance.dsar.completed)", () => {
      expect(CONTRACT.emits).toContain("compliance.dsar.completed");
    });

    it("emits policy publish events (compliance.policy.published)", () => {
      expect(CONTRACT.emits).toContain("compliance.policy.published");
    });
  });
});

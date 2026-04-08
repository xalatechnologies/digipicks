import { describe, it, expect } from "vitest";
import { defineContract } from "../componentContract";

function makeContract(overrides?: Partial<any>) {
  return {
    name: "test-component",
    version: "1.0.0",
    category: "domain" as const,
    queries: {},
    mutations: {},
    emits: [],
    subscribes: [],
    dependencies: { core: [], components: [] },
    ...overrides,
  };
}

describe("defineContract", () => {
  it("valid contract passes validation and returns frozen object", () => {
    const contract = defineContract(makeContract());
    expect(contract).toBeDefined();
    expect(contract.name).toBe("test-component");
    expect(contract.version).toBe("1.0.0");
    expect(contract.category).toBe("domain");
    expect(Object.isFrozen(contract)).toBe(true);
  });

  it("throws on empty name", () => {
    expect(() => defineContract(makeContract({ name: "" }))).toThrow(
      "Component contract must have a name"
    );
  });

  it("throws on missing name", () => {
    const contract = makeContract();
    delete (contract as any).name;
    expect(() => defineContract(contract)).toThrow(
      "Component contract must have a name"
    );
  });

  describe("version validation", () => {
    it('throws on invalid version format "1.0"', () => {
      expect(() => defineContract(makeContract({ version: "1.0" }))).toThrow(
        "Invalid version format"
      );
    });

    it('throws on invalid version format "abc"', () => {
      expect(() => defineContract(makeContract({ version: "abc" }))).toThrow(
        "Invalid version format"
      );
    });

    it('throws on invalid version format "1.0.0.0"', () => {
      expect(() =>
        defineContract(makeContract({ version: "1.0.0.0" }))
      ).toThrow("Invalid version format");
    });

    it('accepts valid semver "1.0.0"', () => {
      const contract = defineContract(makeContract({ version: "1.0.0" }));
      expect(contract.version).toBe("1.0.0");
    });

    it('accepts valid semver "2.3.4"', () => {
      const contract = defineContract(makeContract({ version: "2.3.4" }));
      expect(contract.version).toBe("2.3.4");
    });

    it('accepts valid semver "10.20.30"', () => {
      const contract = defineContract(makeContract({ version: "10.20.30" }));
      expect(contract.version).toBe("10.20.30");
    });
  });

  it("throws on missing category", () => {
    const contract = makeContract();
    delete (contract as any).category;
    expect(() => defineContract(contract)).toThrow(
      "Component contract must have a category"
    );
  });

  describe("event topic validation", () => {
    it('throws on invalid emit topic "invalid"', () => {
      expect(() =>
        defineContract(makeContract({ emits: ["invalid"] }))
      ).toThrow("Invalid event topic format");
    });

    it('throws on invalid emit topic "too.many.dots.here"', () => {
      expect(() =>
        defineContract(makeContract({ emits: ["too.many.dots.here"] }))
      ).toThrow("Invalid event topic format");
    });

    it('throws on invalid emit topic "UPPERCASE.topic.name"', () => {
      expect(() =>
        defineContract(makeContract({ emits: ["UPPERCASE.topic.name"] }))
      ).toThrow("Invalid event topic format");
    });

    it("accepts valid emit topic format", () => {
      const contract = defineContract(
        makeContract({
          emits: ["reviews.review.created", "compliance.consent.updated"],
        })
      );
      expect(contract.emits).toEqual([
        "reviews.review.created",
        "compliance.consent.updated",
      ]);
    });

    it("validates subscribes topics too", () => {
      expect(() =>
        defineContract(makeContract({ subscribes: ["INVALID"] }))
      ).toThrow("Invalid event topic format");

      const contract = defineContract(
        makeContract({ subscribes: ["resources.resource.deleted"] })
      );
      expect(contract.subscribes).toEqual(["resources.resource.deleted"]);
    });
  });

  it("returns a frozen (immutable) contract object", () => {
    const contract = defineContract(makeContract());
    expect(Object.isFrozen(contract)).toBe(true);
    expect(() => {
      (contract as any).name = "changed";
    }).toThrow();
  });

  it("contract has all required fields after creation", () => {
    const contract = defineContract(
      makeContract({
        description: "A test component",
        emits: ["test.entity.created"],
        subscribes: ["other.entity.deleted"],
        dependencies: { core: ["tenants", "users"], components: ["audit"] },
      })
    );

    expect(contract.name).toBe("test-component");
    expect(contract.version).toBe("1.0.0");
    expect(contract.category).toBe("domain");
    expect(contract.description).toBe("A test component");
    expect(contract.queries).toEqual({});
    expect(contract.mutations).toEqual({});
    expect(contract.emits).toEqual(["test.entity.created"]);
    expect(contract.subscribes).toEqual(["other.entity.deleted"]);
    expect(contract.dependencies).toEqual({
      core: ["tenants", "users"],
      components: ["audit"],
    });
  });
});

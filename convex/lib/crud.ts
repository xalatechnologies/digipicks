/**
 * CRUD Utilities
 * 
 * Auto-generated CRUD operations for core tables only.
 * Component tables have their own CRUD in component functions.
 * 
 * @see https://stack.convex.dev/crud-and-rest
 */

import { crud } from "convex-helpers/server/crud";
import schema from "../schema";

// =============================================================================
// CORE TABLE CRUD (tables that remain in app schema)
// =============================================================================

export const tenantsCrud = crud(schema, "tenants");
export const usersCrud = crud(schema, "users");
export const organizationsCrud = crud(schema, "organizations");

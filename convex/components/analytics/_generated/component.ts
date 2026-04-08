/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    functions: {
      createReportSchedule: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          cronExpression: string;
          description?: string;
          filters?: any;
          format: string;
          metadata?: any;
          name: string;
          recipients: Array<string>;
          reportType: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      deleteReportSchedule: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      getAvailabilityMetrics: FunctionReference<
        "query",
        "internal",
        { periodEnd: number; periodStart: number; resourceId: string },
        Array<any>,
        Name
      >;
      getBookingMetrics: FunctionReference<
        "query",
        "internal",
        {
          periodEnd: number;
          periodStart: number;
          resourceId?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      importAvailabilityMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          bookedSlots: number;
          calculatedAt: number;
          metadata?: any;
          period: string;
          periodEnd: number;
          periodStart: number;
          popularTimeSlots: Array<any>;
          resourceId: string;
          tenantId: string;
          totalSlots: number;
          utilizationRate: number;
        },
        { id: string },
        Name
      >;
      importBookingMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          calculatedAt: number;
          count?: number;
          metadata?: any;
          metricType: string;
          period: string;
          periodEnd: number;
          periodStart: number;
          resourceId?: string;
          tenantId: string;
          value: number;
        },
        { id: string },
        Name
      >;
      importReportSchedule: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          cronExpression: string;
          description?: string;
          enabled: boolean;
          filters?: any;
          format: string;
          lastRunAt?: number;
          metadata?: any;
          name: string;
          nextRunAt?: number;
          recipients: Array<string>;
          reportType: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      importScheduledReport: FunctionReference<
        "mutation",
        "internal",
        {
          completedAt?: number;
          error?: string;
          fileSize?: string;
          fileUrl?: string;
          metadata?: any;
          scheduleId: string;
          startedAt?: number;
          status: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      listReportSchedules: FunctionReference<
        "query",
        "internal",
        { enabled?: boolean; tenantId: string },
        Array<any>,
        Name
      >;
      storeAvailabilityMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          bookedSlots: number;
          metadata?: any;
          period: string;
          periodEnd: number;
          periodStart: number;
          popularTimeSlots: Array<any>;
          resourceId: string;
          tenantId: string;
          totalSlots: number;
          utilizationRate: number;
        },
        { id: string },
        Name
      >;
      storeBookingMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          count?: number;
          metadata?: any;
          metricType: string;
          period: string;
          periodEnd: number;
          periodStart: number;
          resourceId?: string;
          tenantId: string;
          value: number;
        },
        { id: string },
        Name
      >;
      updateReportSchedule: FunctionReference<
        "mutation",
        "internal",
        {
          cronExpression?: string;
          description?: string;
          enabled?: boolean;
          filters?: any;
          format?: string;
          id: string;
          metadata?: any;
          name?: string;
          recipients?: Array<string>;
        },
        { success: boolean },
        Name
      >;
    };
  };

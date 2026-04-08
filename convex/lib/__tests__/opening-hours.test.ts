/**
 * Opening Hours & Slot Generation — Pure Business Logic Tests
 *
 * Extracted from tests/convex/calendar-opening-hours.test.ts
 * Tests time slot generation algorithms and opening hours resolution.
 * No Convex runtime required — plain vitest with algorithms.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// Types
// =============================================================================

interface OpeningHours {
  dayIndex: number;
  day: string;
  open: string;
  close: string;
  isClosed?: boolean;
}

interface TimeSlot {
  time: string;
  status: "available" | "unavailable" | "occupied" | "selected";
  isPast: boolean;
  isOutsideHours?: boolean;
}

interface DayColumn {
  dayIndex: number;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  slots: TimeSlot[];
  openingHours: { open: string; close: string };
}

// =============================================================================
// Algorithm Implementations (mirrored from frontend)
// =============================================================================

/**
 * Generate time slots for a week - CORRECT IMPLEMENTATION
 * Only generates slots within each day's specific opening hours
 */
function generateTimeSlotsCorrect(
  openingHoursArr: OpeningHours[],
  slotDurationMinutes: number = 60
): DayColumn[] {
  const dayNames = ["Son", "Man", "Tir", "Ons", "Tor", "Fre", "Lor"];
  const openingHoursMap: Record<number, OpeningHours> = {};

  for (const oh of openingHoursArr) {
    openingHoursMap[oh.dayIndex] = oh;
  }

  return Array.from({ length: 7 }, (_, idx) => {
    const dayIndex = idx; // 0=Sunday, 1=Monday, etc.
    const hours = openingHoursMap[dayIndex] || {
      open: "08:00",
      close: "18:00",
      isClosed: false,
    };

    if (hours.isClosed) {
      return {
        dayIndex,
        dayName: dayNames[dayIndex] ?? "",
        dayNumber: idx + 1,
        isToday: false,
        slots: [], // No slots for closed days
        openingHours: { open: hours.open, close: hours.close },
      };
    }

    const [openH, openM] = hours.open.split(":").map(Number);
    const [closeH, closeM] = hours.close.split(":").map(Number);
    const dayStartMins = (openH ?? 8) * 60 + (openM ?? 0);
    const dayEndMins = (closeH ?? 18) * 60 + (closeM ?? 0);

    const slots: TimeSlot[] = [];
    // Only generate slots within this day's opening hours
    for (let mins = dayStartMins; mins < dayEndMins; mins += slotDurationMinutes) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

      slots.push({
        time: timeStr,
        status: "available",
        isPast: false,
        isOutsideHours: false,
      });
    }

    return {
      dayIndex,
      dayName: dayNames[dayIndex] ?? "",
      dayNumber: idx + 1,
      isToday: false,
      slots,
      openingHours: { open: hours.open, close: hours.close },
    };
  });
}

/**
 * Generate time slots - CURRENT (BUGGY) IMPLEMENTATION
 * Uses global time grid for all days
 */
function generateTimeSlotsGlobal(
  openingHoursArr: OpeningHours[],
  slotDurationMinutes: number = 60
): DayColumn[] {
  const dayNames = ["Son", "Man", "Tir", "Ons", "Tor", "Fre", "Lor"];
  const openingHoursMap: Record<number, OpeningHours> = {};

  for (const oh of openingHoursArr) {
    openingHoursMap[oh.dayIndex] = oh;
  }

  // Find global min/max (the buggy approach)
  let globalStartMins = 24 * 60;
  let globalEndMins = 0;
  for (let dow = 0; dow < 7; dow++) {
    const hours = openingHoursMap[dow] || { open: "08:00", close: "18:00" };
    if (hours.isClosed) continue;
    const [openH, openM] = hours.open.split(":").map(Number);
    const [closeH, closeM] = hours.close.split(":").map(Number);
    const startMins = (openH ?? 8) * 60 + (openM ?? 0);
    const endMins = (closeH ?? 18) * 60 + (closeM ?? 0);
    if (startMins < globalStartMins) globalStartMins = startMins;
    if (endMins > globalEndMins) globalEndMins = endMins;
  }

  return Array.from({ length: 7 }, (_, idx) => {
    const dayIndex = idx;
    const hours = openingHoursMap[dayIndex] || { open: "08:00", close: "18:00" };

    const [openH, openM] = hours.open.split(":").map(Number);
    const [closeH, closeM] = hours.close.split(":").map(Number);
    const dayStartMins = (openH ?? 8) * 60 + (openM ?? 0);
    const dayEndMins = (closeH ?? 18) * 60 + (closeM ?? 0);

    const slots: TimeSlot[] = [];
    // Uses global range (buggy)
    for (let mins = globalStartMins; mins < globalEndMins; mins += slotDurationMinutes) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

      const isOutsideHours = hours.isClosed || mins < dayStartMins || mins >= dayEndMins;

      slots.push({
        time: timeStr,
        status: isOutsideHours ? "unavailable" : "available",
        isPast: isOutsideHours,
        isOutsideHours,
      });
    }

    return {
      dayIndex,
      dayName: dayNames[dayIndex] ?? "",
      dayNumber: idx + 1,
      isToday: false,
      slots,
      openingHours: { open: hours.open, close: hours.close },
    };
  });
}

/**
 * Resolve effective day hours, considering exceptions.
 * Mirrors availability.ts logic:
 * 1. If an exception exists for the date and is closed -> null (closed)
 * 2. If an exception exists with custom hours -> use exception hours
 * 3. Otherwise -> fall back to regular weekly hours
 */
function resolveEffectiveDayHours(
  dateStr: string,
  dayIndex: number,
  openingHours: OpeningHours[],
  exceptions: Array<{
    date: string;
    closed?: boolean;
    open?: string;
    close?: string;
    reason?: string;
  }>
): { open: string; close: string } | null {
  const exception = exceptions.find((e) => e.date === dateStr);
  if (exception) {
    if (exception.closed) return null;
    if (exception.open && exception.close) {
      return { open: exception.open, close: exception.close };
    }
  }
  const dayHours = openingHours.find((h) => h.dayIndex === dayIndex);
  if (!dayHours || dayHours.isClosed) return null;
  return { open: dayHours.open, close: dayHours.close };
}

// =============================================================================
// Test Fixtures
// =============================================================================

const standardOpeningHours: OpeningHours[] = [
  { dayIndex: 0, day: "Sondag", open: "10:00", close: "18:00", isClosed: false },
  { dayIndex: 1, day: "Mandag", open: "08:00", close: "21:00", isClosed: false },
  { dayIndex: 2, day: "Tirsdag", open: "08:00", close: "21:00", isClosed: false },
  { dayIndex: 3, day: "Onsdag", open: "08:00", close: "21:00", isClosed: false },
  { dayIndex: 4, day: "Torsdag", open: "08:00", close: "21:00", isClosed: false },
  { dayIndex: 5, day: "Fredag", open: "08:00", close: "22:00", isClosed: false },
  { dayIndex: 6, day: "Lordag", open: "09:00", close: "20:00", isClosed: false },
];

const hoursWithClosedDay: OpeningHours[] = [
  { dayIndex: 0, day: "Sondag", open: "00:00", close: "00:00", isClosed: true },
  { dayIndex: 1, day: "Mandag", open: "08:00", close: "20:00", isClosed: false },
  { dayIndex: 2, day: "Tirsdag", open: "08:00", close: "20:00", isClosed: false },
  { dayIndex: 3, day: "Onsdag", open: "08:00", close: "20:00", isClosed: false },
  { dayIndex: 4, day: "Torsdag", open: "08:00", close: "20:00", isClosed: false },
  { dayIndex: 5, day: "Fredag", open: "08:00", close: "20:00", isClosed: false },
  { dayIndex: 6, day: "Lordag", open: "10:00", close: "18:00", isClosed: false },
];

// =============================================================================
// Tests
// =============================================================================

describe("Calendar Opening Hours", () => {
  describe("Opening Hours Slot Generation", () => {
    it("OH-1.1: should generate slots only within opening hours (correct implementation)", () => {
      const result = generateTimeSlotsCorrect(standardOpeningHours, 60);

      // Sunday opens 10:00, should not have 08:00 or 09:00 slots
      const sunday = result.find((d) => d.dayIndex === 0);
      expect(sunday?.slots.map((s) => s.time)).not.toContain("08:00");
      expect(sunday?.slots.map((s) => s.time)).not.toContain("09:00");
      expect(sunday?.slots[0]?.time).toBe("10:00");

      // Monday opens 08:00, should start at 08:00
      const monday = result.find((d) => d.dayIndex === 1);
      expect(monday?.slots[0]?.time).toBe("08:00");

      // Friday closes 22:00, should have 21:00 as last slot
      const friday = result.find((d) => d.dayIndex === 5);
      expect(friday?.slots[friday.slots.length - 1]?.time).toBe("21:00");
    });

    it("OH-1.2: should not show unavailable slots for times outside hours", () => {
      const result = generateTimeSlotsCorrect(standardOpeningHours, 60);

      // All slots in correct implementation should be available (not outside hours)
      for (const day of result) {
        for (const slot of day.slots) {
          expect(slot.status).toBe("available");
          expect(slot.isOutsideHours).toBeFalsy();
        }
      }
    });

    it("OH-1.3: global grid shows unavailable slots (demonstrating the bug)", () => {
      const result = generateTimeSlotsGlobal(standardOpeningHours, 60);

      // Global implementation shows 08:00 on Sunday as unavailable
      const sunday = result.find((d) => d.dayIndex === 0);
      const sunday8am = sunday?.slots.find((s) => s.time === "08:00");
      expect(sunday8am).toBeDefined();
      expect(sunday8am?.status).toBe("unavailable");
      expect(sunday8am?.isOutsideHours).toBe(true);
    });

    it("OH-1.4: correct implementation has fewer slots on days with shorter hours", () => {
      const result = generateTimeSlotsCorrect(standardOpeningHours, 60);

      const sunday = result.find((d) => d.dayIndex === 0); // 10:00-18:00 = 8 slots
      const monday = result.find((d) => d.dayIndex === 1); // 08:00-21:00 = 13 slots
      const friday = result.find((d) => d.dayIndex === 5); // 08:00-22:00 = 14 slots

      expect(sunday?.slots.length).toBe(8);
      expect(monday?.slots.length).toBe(13);
      expect(friday?.slots.length).toBe(14);
    });

    it("OH-1.5: global grid has same number of slots for all days (the bug)", () => {
      const result = generateTimeSlotsGlobal(standardOpeningHours, 60);

      // All days have same slot count with global grid
      const sundaySlotCount = result.find((d) => d.dayIndex === 0)?.slots.length;
      const mondaySlotCount = result.find((d) => d.dayIndex === 1)?.slots.length;
      const fridaySlotCount = result.find((d) => d.dayIndex === 5)?.slots.length;

      expect(sundaySlotCount).toBe(mondaySlotCount);
      expect(mondaySlotCount).toBe(fridaySlotCount);
    });
  });

  describe("Closed Days", () => {
    it("OH-2.1: should have no slots on closed days", () => {
      const result = generateTimeSlotsCorrect(hoursWithClosedDay, 60);

      const sunday = result.find((d) => d.dayIndex === 0);
      expect(sunday?.slots).toHaveLength(0);
    });

    it("OH-2.2: open days should still have correct slots", () => {
      const result = generateTimeSlotsCorrect(hoursWithClosedDay, 60);

      const monday = result.find((d) => d.dayIndex === 1);
      expect(monday?.slots.length).toBe(12); // 08:00-20:00 = 12 slots

      const saturday = result.find((d) => d.dayIndex === 6);
      expect(saturday?.slots.length).toBe(8); // 10:00-18:00 = 8 slots
    });
  });

  describe("Slot Duration", () => {
    const standardHours: OpeningHours[] = [
      { dayIndex: 1, day: "Mandag", open: "08:00", close: "12:00", isClosed: false },
    ];

    it("OH-3.1: 30-minute slots should double the count", () => {
      const result60 = generateTimeSlotsCorrect(standardHours, 60);
      const result30 = generateTimeSlotsCorrect(standardHours, 30);

      const monday60 = result60.find((d) => d.dayIndex === 1);
      const monday30 = result30.find((d) => d.dayIndex === 1);

      expect(monday60?.slots.length).toBe(4); // 08, 09, 10, 11
      expect(monday30?.slots.length).toBe(8); // 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
    });

    it("OH-3.2: half-hour slots should include :30 times", () => {
      const result = generateTimeSlotsCorrect(standardHours, 30);
      const monday = result.find((d) => d.dayIndex === 1);

      expect(monday?.slots.map((s) => s.time)).toContain("08:30");
      expect(monday?.slots.map((s) => s.time)).toContain("09:30");
      expect(monday?.slots.map((s) => s.time)).toContain("10:30");
    });
  });

  describe("Edge Cases", () => {
    it("OH-4.1: should handle empty opening hours with defaults", () => {
      const result = generateTimeSlotsCorrect([], 60);

      // Should use defaults (08:00-18:00)
      const monday = result.find((d) => d.dayIndex === 1);
      expect(monday?.slots[0]?.time).toBe("08:00");
      expect(monday?.slots.length).toBe(10); // 08:00-18:00
    });

    it("OH-4.2: should handle midnight closing (24-hour venue)", () => {
      const lateNightHours: OpeningHours[] = [
        { dayIndex: 5, day: "Fredag", open: "18:00", close: "24:00", isClosed: false },
      ];

      const result = generateTimeSlotsCorrect(lateNightHours, 60);
      const friday = result.find((d) => d.dayIndex === 5);

      expect(friday?.slots[0]?.time).toBe("18:00");
      expect(friday?.slots[friday.slots.length - 1]?.time).toBe("23:00");
      expect(friday?.slots.length).toBe(6); // 18, 19, 20, 21, 22, 23
    });

    it("OH-4.3: should handle early morning opening", () => {
      const earlyHours: OpeningHours[] = [
        { dayIndex: 1, day: "Mandag", open: "05:00", close: "10:00", isClosed: false },
      ];

      const result = generateTimeSlotsCorrect(earlyHours, 60);
      const monday = result.find((d) => d.dayIndex === 1);

      expect(monday?.slots[0]?.time).toBe("05:00");
      expect(monday?.slots.length).toBe(5);
    });
  });
});

// =============================================================================
// Opening Hours Exceptions
// =============================================================================

describe("Opening Hours Exceptions", () => {
  it("EX-1: holiday exception should close a normally open day", () => {
    const openingHours: OpeningHours[] = [
      { dayIndex: 1, day: "Mandag", open: "08:00", close: "22:00" },
      { dayIndex: 2, day: "Tirsdag", open: "08:00", close: "22:00" },
      { dayIndex: 3, day: "Onsdag", open: "08:00", close: "22:00" },
      { dayIndex: 4, day: "Torsdag", open: "08:00", close: "22:00" },
      { dayIndex: 5, day: "Fredag", open: "08:00", close: "22:00" },
    ];
    const exceptions = [{ date: "2024-12-25", closed: true, reason: "Christmas Day" }];

    // Dec 25, 2024 is a Wednesday (dayIndex 3) -- normally open 08:00-22:00
    const result = resolveEffectiveDayHours("2024-12-25", 3, openingHours, exceptions);
    expect(result).toBeNull();
  });

  it("EX-2: custom hours exception should override regular hours", () => {
    const openingHours: OpeningHours[] = [
      { dayIndex: 1, day: "Mandag", open: "08:00", close: "22:00" },
      { dayIndex: 2, day: "Tirsdag", open: "08:00", close: "22:00" },
      { dayIndex: 3, day: "Onsdag", open: "08:00", close: "22:00" },
      { dayIndex: 4, day: "Torsdag", open: "08:00", close: "22:00" },
      { dayIndex: 5, day: "Fredag", open: "08:00", close: "22:00" },
    ];
    const exceptions = [
      {
        date: "2024-12-31",
        open: "10:00",
        close: "16:00",
        reason: "New Year's Eve early close",
      },
    ];

    // Dec 31, 2024 is a Tuesday (dayIndex 2) -- normally open 08:00-22:00
    const result = resolveEffectiveDayHours("2024-12-31", 2, openingHours, exceptions);
    expect(result).not.toBeNull();
    expect(result!.open).toBe("10:00");
    expect(result!.close).toBe("16:00");
  });

  it("EX-3: no exception should fall back to regular hours", () => {
    const openingHours: OpeningHours[] = [
      { dayIndex: 1, day: "Mandag", open: "08:00", close: "22:00" },
      { dayIndex: 2, day: "Tirsdag", open: "08:00", close: "22:00" },
      { dayIndex: 3, day: "Onsdag", open: "08:00", close: "22:00" },
      { dayIndex: 4, day: "Torsdag", open: "08:00", close: "22:00" },
      { dayIndex: 5, day: "Fredag", open: "08:00", close: "22:00" },
    ];
    const exceptions = [{ date: "2024-12-25", closed: true, reason: "Christmas Day" }];

    // A non-exception date should use regular hours
    const result = resolveEffectiveDayHours("2024-03-15", 5, openingHours, exceptions);
    expect(result).not.toBeNull();
    expect(result!.open).toBe("08:00");
    expect(result!.close).toBe("22:00");
  });
});

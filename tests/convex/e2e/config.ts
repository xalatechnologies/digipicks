/**
 * Convex E2E Test Configuration
 *
 * Configuration and utilities for Convex E2E tests.
 */

// import { convexTest } from 'convex-test';
// import type { DataModel } from '../../convex/_generated/dataModel';

// Test configuration
export const TEST_CONFIG = {
    // Time configurations
    TIMEZONES: ['Europe/Oslo', 'America/New_York', 'Asia/Tokyo'],
    LOCALES: ['nb-NO', 'en-US', 'ja-JP'],
    
    // Booking configurations
    DEFAULT_BOOKING_DURATION: 3600000, // 1 hour in ms
    MAX_BOOKING_DURATION: 28800000, // 8 hours in ms
    MIN_BOOKING_NOTICE: 86400000, // 24 hours in ms
    
    // Pricing configurations
    DEFAULT_CURRENCY: 'NOK',
    PRICE_PRECISION: 2,
    
    // User limits
    MAX_USERS_PER_TENANT: 1000,
    MAX_RESOURCES_PER_TENANT: 500,
    MAX_BOOKINGS_PER_USER_PER_MONTH: 100,
    
    // Test data
    SAMPLE_USERS: [
        { email: 'admin@test.com', name: 'Admin User', role: 'admin' },
        { email: 'manager@test.com', name: 'Manager User', role: 'manager' },
        { email: 'user@test.com', name: 'Regular User', role: 'user' },
    ],
    
    SAMPLE_RESOURCES: [
        {
            name: 'Conference Room A',
            slug: 'conference-room-a',
            category: 'MEETING_ROOMS',
            capacity: 20,
            features: ['projector', 'whiteboard', 'video-conference'],
        },
        {
            name: 'Meeting Room B',
            slug: 'meeting-room-b',
            category: 'MEETING_ROOMS',
            capacity: 10,
            features: ['projector', 'speakerphone'],
        },
        {
            name: 'Event Hall',
            slug: 'event-hall',
            category: 'EVENT_SPACES',
            capacity: 100,
            features: ['stage', 'sound-system', 'lighting'],
        },
    ],
};

// Test utilities
export class TestUtils {
    /**
     * Creates a test tenant with default configuration
     */
    static async createTestTenant(convex: any, overrides: Partial<any> = {}) {
        return await convex.mutation('tenants:create', {
            name: 'Test Tenant',
            slug: 'test-tenant-' + Date.now(),
            settings: {
                locale: 'nb-NO',
                currency: 'NOK',
                timezone: 'Europe/Oslo',
                bookingSettings: {
                    requireApproval: false,
                    maxBookingDuration: TEST_CONFIG.MAX_BOOKING_DURATION,
                    minBookingNotice: TEST_CONFIG.MIN_BOOKING_NOTICE,
                },
                ...overrides.settings,
            },
            seatLimits: {
                maxUsers: TEST_CONFIG.MAX_USERS_PER_TENANT,
                maxResources: TEST_CONFIG.MAX_RESOURCES_PER_TENANT,
                maxBookingsPerMonth: TEST_CONFIG.MAX_BOOKINGS_PER_USER_PER_MONTH,
                ...overrides.seatLimits,
            },
            ...overrides,
        });
    }

    /**
     * Creates a test user with specified role
     */
    static async createTestUser(
        convex: any,
        tenantId: string,
        role: 'admin' | 'manager' | 'user' = 'user',
        overrides: Partial<any> = {}
    ) {
        const userData = TEST_CONFIG.SAMPLE_USERS.find(u => u.role === role);
        
        const userId = await convex.mutation('users:create', {
            tenantId,
            email: userData?.email || `${role}@test.com`,
            name: userData?.name || `${role} User`,
            status: 'active',
            ...overrides,
        });

        // Create and assign role if not default user
        if (role !== 'user') {
            const roleId = await convex.mutation('rbac:createRole', {
                tenantId,
                name: role.charAt(0).toUpperCase() + role.slice(1),
                permissions: role === 'admin' 
                    ? ['*'] 
                    : ['resource:read', 'resource:write', 'booking:read', 'booking:write'],
                ...overrides,
            });

            await convex.mutation('rbac:assignRole', {
                tenantId,
                userId,
                roleId,
            });
        }

        return userId;
    }

    /**
     * Creates a test resource with amenities
     */
    static async createTestResource(
        convex: any,
        tenantId: string,
        resourceIndex: number = 0,
        overrides: Partial<any> = {}
    ) {
        const resourceData = TEST_CONFIG.SAMPLE_RESOURCES[resourceIndex];
        
        // Create category if not exists
        const categoryId = await convex.mutation('categories:create', {
            tenantId,
            name: resourceData.category.replace('_', ' '),
            key: resourceData.category,
            color: '#3B82F6',
        });

        // Create amenity group
        const amenityGroupId = await convex.mutation('amenityGroups:create', {
            tenantId,
            name: 'Equipment',
            description: 'Available equipment',
        });

        // Create amenities
        const amenityIds = [];
        for (const feature of resourceData.features) {
            const amenityId = await convex.mutation('amenities:create', {
                tenantId,
                name: feature.charAt(0).toUpperCase() + feature.slice(1),
                groupId: amenityGroupId,
                icon: feature,
            });
            amenityIds.push(amenityId);
        }

        // Create resource
        const resourceId = await convex.mutation('resources:create', {
            tenantId,
            name: resourceData.name,
            slug: resourceData.slug,
            categoryKey: resourceData.category,
            capacity: resourceData.capacity,
            features: resourceData.features,
            status: 'published',
            requiresApproval: false,
            timeMode: 'PERIOD',
            ...overrides,
        });

        // Add amenities to resource
        for (const amenityId of amenityIds) {
            await convex.mutation('amenities:addToResource', {
                resourceId,
                amenityId,
                quantity: 1,
            });
        }

        // Create pricing
        const pricingGroupId = await convex.mutation('pricingGroups:create', {
            tenantId,
            name: 'Standard',
            isDefault: true,
        });

        await convex.mutation('pricing:createResourcePricing', {
            tenantId,
            resourceId,
            pricingGroupId,
            basePrice: 100 * (resourceIndex + 1),
            pricePerHour: 100 * (resourceIndex + 1),
            currency: TEST_CONFIG.DEFAULT_CURRENCY,
        });

        return resourceId;
    }

    /**
     * Creates a test booking
     */
    static async createTestBooking(
        convex: any,
        tenantId: string,
        resourceId: string,
        userId: string,
        startTime?: number,
        duration: number = TEST_CONFIG.DEFAULT_BOOKING_DURATION,
        overrides: Partial<any> = {}
    ) {
        const bookingStartTime = startTime || (Date.now() + 86400000); // Tomorrow
        
        return await convex.mutation('bookings:create', {
            tenantId,
            resourceId,
            userId,
            startTime: bookingStartTime,
            endTime: bookingStartTime + duration,
            status: 'pending',
            ...overrides,
        });
    }

    /**
     * Waits for a condition to be true
     */
    static async waitFor(
        condition: () => Promise<boolean>,
        timeout: number = 5000,
        interval: number = 100
    ): Promise<void> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        throw new Error(`Condition not met within ${timeout}ms`);
    }

    /**
     * Generates test data for bulk operations
     */
    static generateBulkTestData<T>(
        generator: (index: number) => T,
        count: number
    ): T[] {
        return Array.from({ length: count }, (_, i) => generator(i));
    }

    /**
     * Creates a date in the future
     */
    static futureDate(daysFromNow: number = 1): Date {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date;
    }

    /**
     * Creates a date in the past
     */
    static pastDate(daysAgo: number = 1): Date {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date;
    }

    /**
     * Formats currency for testing
     */
    static formatCurrency(amount: number, currency: string = TEST_CONFIG.DEFAULT_CURRENCY): string {
        return new Intl.NumberFormat('nb-NO', {
            style: 'currency',
            currency,
        }).format(amount / 100); // Assuming amount is in cents
    }
}

// Custom matchers for testing
export const customMatchers = {
    toBeValidId(received: string) {
        const pass = typeof received === 'string' && received.length > 0;
        return {
            message: () => `expected ${received} to be a valid ID`,
            pass,
        };
    },
    
    toBeWithinTimeRange(
        received: number,
        start: number,
        end: number
    ) {
        const pass = received >= start && received <= end;
        return {
            message: () => 
                `expected ${received} to be within time range ${start} - ${end}`,
            pass,
        };
    },
    
    toHaveValidTimestamp(received: any) {
        const timestamp = received._creationTime || received.createdAt || received.updatedAt;
        const pass = typeof timestamp === 'number' && timestamp > 0;
        return {
            message: () => `expected ${received} to have a valid timestamp`,
            pass,
        };
    },
};

// Test hooks
export const testHooks = {
    /**
     * Runs before all tests in a suite
     */
    async beforeAll() {
        // Setup global test state
        console.log('Starting Convex E2E tests...');
    },

    /**
     * Runs after all tests in a suite
     */
    async afterAll() {
        // Cleanup global test state
        console.log('Convex E2E tests completed.');
    },

    /**
     * Runs before each test
     */
    async beforeEach() {
        // Reset test state
    },

    /**
     * Runs after each test
     */
    async afterEach() {
        // Cleanup test state
    },
};

// Export default configuration
export default {
    TEST_CONFIG,
    TestUtils,
    customMatchers,
    testHooks,
};

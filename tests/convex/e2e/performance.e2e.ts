/**
 * Convex E2E Tests - Performance Tests
 *
 * Performance and load testing for Convex functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import { convexTest } from 'convex-test';
// import { api } from '../../convex/_generated/api';

describe('Convex E2E - Performance Tests', () => {
    let convex: any;
    let tenantId: string;
    let userId: string;

    beforeEach(async () => {
        // Mock convex instance for now
        convex = {
            mutation: vi.fn().mockResolvedValue('mock-id'),
            query: vi.fn().mockResolvedValue({}),
            close: vi.fn(),
        };
        
        // Setup tenant
        tenantId = await convex.mutation('tenants:create', {
            name: 'Performance Test Tenant',
            slug: 'perf-test-tenant',
            settings: { locale: 'nb-NO', currency: 'NOK' },
        });

        // Create user
        userId = await convex.mutation('users:create', {
            tenantId,
            email: 'perf@test.com',
            name: 'Performance Test User',
        });
    });

    afterEach(async () => {
        await convex.close();
    });

    describe('Query Performance', () => {
        it('should handle large resource lists efficiently', async () => {
            // Create 500 resources
            const resourceIds = [];
            for (let i = 0; i < 500; i++) {
                const id = await convex.mutation('resources:create', {
                    tenantId,
                    name: `Performance Resource ${i}`,
                    slug: `perf-resource-${i}`,
                    categoryKey: 'MEETING_ROOMS',
                    capacity: Math.floor(Math.random() * 50) + 5,
                    features: ['projector', 'whiteboard'],
                });
                resourceIds.push(id);
            }

            // Test paginated query performance
            const startTime = Date.now();
            const page1 = await convex.query('resources:list', {
                tenantId,
                pagination: { page: 1, limit: 20 },
                filters: {
                    capacity: { min: 10, max: 30 },
                },
            });
            const queryTime = Date.now() - startTime;

            expect(queryTime).toBeLessThan(500); // Under 500ms
            expect(page1.results.length).toBe(20);

            // Test cursor-based pagination
            const cursorStart = Date.now();
            const cursorPage = await convex.query('resources:listCursor', {
                tenantId,
                cursor: null,
                limit: 20,
                filters: {
                    capacity: { min: 10, max: 30 },
                },
            });
            const cursorTime = Date.now() - cursorStart;

            expect(cursorTime).toBeLessThan(300); // Cursor should be faster
            expect(cursorPage.results.length).toBe(20);
        });

        it('should handle complex search queries', async () => {
            // Create resources with various attributes
            const categories = ['MEETING_ROOMS', 'EVENT_SPACES', 'WORKSPACES'];
            const features = ['projector', 'whiteboard', 'video-conference', 'sound-system'];
            
            for (let i = 0; i < 200; i++) {
                await convex.mutation('resources:create', {
                    tenantId,
                    name: `Search Resource ${i}`,
                    slug: `search-resource-${i}`,
                    categoryKey: categories[i % 3],
                    capacity: Math.floor(Math.random() * 100) + 5,
                    features: features.slice(0, Math.floor(Math.random() * 4) + 1),
                    price: Math.floor(Math.random() * 1000) + 100,
                });
            }

            // Complex search with multiple filters
            const searchStart = Date.now();
            const searchResults = await convex.query('resources:search', {
                tenantId,
                query: 'meeting',
                filters: {
                    categories: ['MEETING_ROOMS'],
                    capacity: { min: 20, max: 50 },
                    features: ['projector'],
                    price: { max: 500 },
                    availability: {
                        startDate: Date.now() + 86400000,
                        endDate: Date.now() + 7 * 86400000,
                    },
                },
                sort: { field: 'price', order: 'asc' },
                pagination: { page: 1, limit: 10 },
            });
            const searchTime = Date.now() - searchStart;

            expect(searchTime).toBeLessThan(1000); // Under 1 second
            expect(searchResults.results.length).toBeLessThanOrEqual(10);
        });

        it('should handle analytics aggregation efficiently', async () => {
            // Create bookings over a year
            const bookingIds = [];
            const now = Date.now();
            
            for (let day = 0; day < 365; day++) {
                for (let booking = 0; booking < 10; booking++) {
                    const id = await convex.mutation('bookings:create', {
                        tenantId,
                        resourceId: 'analytics-resource',
                        userId,
                        startTime: now + day * 86400000 + booking * 3600000,
                        endTime: now + day * 86400000 + (booking + 1) * 3600000,
                        status: booking % 10 === 0 ? 'cancelled' : 'confirmed',
                        totalPrice: Math.floor(Math.random() * 1000) + 100,
                    });
                    bookingIds.push(id);
                }
            }

            // Test yearly analytics
            const analyticsStart = Date.now();
            const analytics = await convex.query('analytics:getYearlyReport', {
                tenantId,
                year: new Date().getFullYear(),
            });
            const analyticsTime = Date.now() - analyticsStart;

            expect(analyticsTime).toBeLessThan(2000); // Under 2 seconds
            expect(analytics.totalBookings).toBe(3650);
            expect(analytics.monthlyData).toHaveLength(12);

            // Test real-time dashboard data
            const dashboardStart = Date.now();
            const dashboard = await convex.query('analytics:getDashboardData', {
                tenantId,
                period: 'last-30-days',
            });
            const dashboardTime = Date.now() - dashboardStart;

            expect(dashboardTime).toBeLessThan(1000); // Under 1 second
            expect(dashboard.keyMetrics).toBeDefined();
            expect(dashboard.charts).toBeDefined();
        });
    });

    describe('Mutation Performance', () => {
        it('should handle bulk booking creation', async () => {
            const bookingCount = 100;
            const baseTime = Date.now() + 86400000;
            const bookings = [];

            // Create bookings in parallel
            const bulkStart = Date.now();
            const promises = [];
            
            for (let i = 0; i < bookingCount; i++) {
                promises.push(
                    convex.mutation('bookings:create', {
                        tenantId,
                        resourceId: 'bulk-resource',
                        userId,
                        startTime: baseTime + i * 86400000,
                        endTime: baseTime + i * 86400000 + 3600000,
                    })
                );
            }

            const results = await Promise.all(promises);
            const bulkTime = Date.now() - bulkStart;

            expect(bulkTime).toBeLessThan(3000); // Under 3 seconds
            expect(results.length).toBe(bookingCount);

            // Calculate average time per booking
            const avgTimePerBooking = bulkTime / bookingCount;
            expect(avgTimePerBooking).toBeLessThan(50); // Under 50ms per booking
        });

        it('should handle concurrent user operations', async () => {
            const userCount = 50;
            const operationsPerUser = 10;
            
            // Create multiple users
            const userIds = [];
            for (let i = 0; i < userCount; i++) {
                const id = await convex.mutation('users:create', {
                    tenantId,
                    email: `user${i}@test.com`,
                    name: `User ${i}`,
                });
                userIds.push(id);
            }

            // Simulate concurrent operations
            const concurrentStart = Date.now();
            const allOperations = [];

            for (let userId of userIds) {
                for (let op = 0; op < operationsPerUser; op++) {
                    allOperations.push(
                        convex.mutation('bookings:create', {
                            tenantId,
                            resourceId: 'concurrent-resource',
                            userId,
                            startTime: Date.now() + op * 86400000,
                            endTime: Date.now() + op * 86400000 + 3600000,
                        })
                    );
                }
            }

            const results = await Promise.allSettled(allOperations);
            const concurrentTime = Date.now() - concurrentStart;

            expect(concurrentTime).toBeLessThan(5000); // Under 5 seconds
            
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');
            
            expect(successful.length + failed.length).toBe(userCount * operationsPerUser);
        });

        it('should handle large data updates efficiently', async () => {
            // Create resource with many amenities
            const resourceId = await convex.mutation('resources:create', {
                tenantId,
                name: 'Large Resource',
                slug: 'large-resource',
                categoryKey: 'EVENT_SPACES',
            });

            // Add 100 amenities
            const amenityIds = [];
            for (let i = 0; i < 100; i++) {
                const id = await convex.mutation('amenities:create', {
                    tenantId,
                    name: `Amenity ${i}`,
                    groupId: 'bulk-group',
                });
                amenityIds.push(id);
            }

            // Bulk update resource with all amenities
            const updateStart = Date.now();
            await convex.mutation('resources:updateBulk', {
                resourceId,
                amenities: amenityIds,
                features: Array.from({ length: 50 }, (_, i) => `feature-${i}`),
                customFields: Array.from({ length: 20 }, (_, i) => ({
                    key: `field-${i}`,
                    value: `value-${i}`,
                })),
            });
            const updateTime = Date.now() - updateStart;

            expect(updateTime).toBeLessThan(2000); // Under 2 seconds

            // Verify update was successful
            const resource = await convex.query('resources:get', {
                resourceId,
            });
            expect(resource.amenities.length).toBe(100);
            expect(resource.features.length).toBe(50);
        });
    });

    describe('Memory and Resource Usage', () => {
        it('should not leak memory during large queries', async () => {
            // Initial memory check
            const initialMemory = process.memoryUsage();

            // Perform many queries
            for (let i = 0; i < 1000; i++) {
                await convex.query('resources:list', {
                    tenantId,
                    pagination: { page: 1, limit: 50 },
                });
                
                // Force garbage collection every 100 iterations
                if (i % 100 === 0 && global.gc) {
                    global.gc();
                }
            }

            // Final memory check
            if (global.gc) {
                global.gc();
            }
            const finalMemory = process.memoryUsage();

            // Memory increase should be reasonable (less than 100MB)
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
        });

        it('should handle file uploads efficiently', async () => {
            // Simulate uploading multiple large files
            const fileSizes = [1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024]; // 1MB, 5MB, 10MB
            const uploadTimes: number[] = [];

            for (const size of fileSizes) {
                const buffer = Buffer.alloc(size, 'x');
                const uploadStart = Date.now();
                
                await convex.mutation('files:upload', {
                    tenantId,
                    filename: `test-file-${size}.bin`,
                    buffer,
                    mimeType: 'application/octet-stream',
                });
                
                const uploadTime = Date.now() - uploadStart;
                uploadTimes.push(uploadTime);
            }

            // Upload speed should be reasonable
            const avgSpeed = fileSizes.reduce((sum, size, i) => 
                sum + size / uploadTimes[i], 0) / fileSizes.length;
            
            expect(avgSpeed).toBeGreaterThan(1024 * 1024); // At least 1MB/s
        });
    });

    describe('Cache Performance', () => {
        it('should cache frequently accessed data', async () => {
            // Create popular resource
            const resourceId = await convex.mutation('resources:create', {
                tenantId,
                name: 'Popular Resource',
                slug: 'popular-resource',
                categoryKey: 'MEETING_ROOMS',
            });

            // First query (cache miss)
            const firstStart = Date.now();
            const firstResult = await convex.query('resources:get', {
                resourceId,
                useCache: true,
            });
            const firstTime = Date.now() - firstStart;

            // Second query (cache hit)
            const secondStart = Date.now();
            const secondResult = await convex.query('resources:get', {
                resourceId,
                useCache: true,
            });
            const secondTime = Date.now() - secondStart;

            // Cached query should be faster
            expect(secondTime).toBeLessThan(firstTime);
            expect(secondResult._id).toBe(firstResult._id);

            // Verify cache statistics
            const cacheStats = await convex.query('system:getCacheStats', {
                tenantId,
            });
            expect(cacheStats.hits).toBeGreaterThan(0);
            expect(cacheStats.hitRate).toBeGreaterThan(0);
        });

        it('should invalidate cache on data changes', async () => {
            const resourceId = await convex.mutation('resources:create', {
                tenantId,
                name: 'Cache Test Resource',
                slug: 'cache-test',
                categoryKey: 'MEETING_ROOMS',
            });

            // Populate cache
            await convex.query('resources:get', { resourceId });
            await convex.query('resources:list', { tenantId });

            // Update resource (should invalidate cache)
            await convex.mutation('resources:update', {
                resourceId,
                name: 'Updated Resource',
            });

            // Query again (should reflect update)
            const updatedResource = await convex.query('resources:get', {
                resourceId,
            });
            expect(updatedResource.name).toBe('Updated Resource');
        });
    });

    describe('Stress Tests', () => {
        it('should handle sustained load', async () => {
            const duration = 10000; // 10 seconds
            const startTime = Date.now();
            const operations = [];
            let operationCount = 0;

            while (Date.now() - startTime < duration) {
                operations.push(
                    convex.query('resources:list', {
                        tenantId,
                        pagination: { page: 1, limit: 10 },
                    })
                );
                operationCount++;
            }

            const results = await Promise.allSettled(operations);
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');

            // Success rate should be high
            const successRate = successful.length / results.length;
            expect(successRate).toBeGreaterThan(0.95); // 95% success rate
            expect(operationCount).toBeGreaterThan(100); // Should handle many operations
        });

        it('should recover from temporary failures', async () => {
            // Simulate intermittent failures
            let callCount = 0;
            convex.query = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount % 5 === 0) {
                    return Promise.reject(new Error('Temporary failure'));
                }
                return Promise.resolve({ results: [] });
            });

            const operations = [];
            for (let i = 0; i < 20; i++) {
                operations.push(
                    convex.query('resources:list', { tenantId })
                        .catch((err: Error) => ({ error: err.message }))
                );
            }

            const results = await Promise.all(operations);
            const failures = results.filter(r => r.error).length;
            
            expect(failures).toBe(4); // Every 5th call fails
            expect(results.length).toBe(20); // All operations complete
        });
    });
});

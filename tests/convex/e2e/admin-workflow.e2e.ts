/**
 * Convex E2E Tests - Admin Workflows
 *
 * End-to-end tests for administrative functions and workflows.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import { convexTest } from 'convex-test';
// import { api } from '../../convex/_generated/api';

describe('Convex E2E - Admin Workflows', () => {
    let convex: any;
    let tenantId: string;
    let adminUserId: string;
    let regularUserId: string;

    beforeEach(async () => {
        // convex = convexTest();
        
        // Mock convex instance for now
        convex = {
            mutation: vi.fn().mockResolvedValue('mock-id'),
            query: vi.fn().mockResolvedValue({}),
            close: vi.fn(),
        };
        
        // Create tenant
        tenantId = await convex.mutation('tenants:create', {
            name: 'Admin Test Tenant',
            slug: 'admin-test-tenant',
            settings: { locale: 'nb-NO', currency: 'NOK' },
        });

        // Create admin role
        const adminRoleId = await convex.mutation('rbac:createRole', {
            tenantId,
            name: 'Administrator',
            description: 'Full system access',
            permissions: ['*'],
            isSystem: true,
        });

        // Create admin user
        adminUserId = await convex.mutation('users:create', {
            tenantId,
            email: 'admin@test.com',
            name: 'Admin User',
        });

        // Assign admin role
        await convex.mutation('rbac:assignRole', {
            tenantId,
            userId: adminUserId,
            roleId: adminRoleId,
        });

        // Create regular user
        regularUserId = await convex.mutation('users:create', {
            tenantId,
            email: 'user@test.com',
            name: 'Regular User',
        });
    });

    afterEach(async () => {
        await convex.close();
    });

    describe('Tenant Management', () => {
        it('should manage tenant settings and configuration', async () => {
            // Update tenant settings
            await convex.mutation('tenants:update', {
                tenantId,
                settings: {
                    locale: 'en-US',
                    currency: 'USD',
                    timezone: 'America/New_York',
                    bookingSettings: {
                        requireApproval: true,
                        maxBookingDuration: 480,
                        minBookingNotice: 24,
                    },
                },
            });

            // Get tenant details
            const tenant = await convex.query('tenants:get', {
                tenantId,
            });

            expect(tenant.settings.locale).toBe('en-US');
            expect(tenant.settings.currency).toBe('USD');
            expect(tenant.settings.bookingSettings.requireApproval).toBe(true);

            // Update seat limits
            await convex.mutation('tenants:updateSeatLimits', {
                tenantId,
                maxUsers: 100,
                maxResources: 50,
                maxBookingsPerMonth: 1000,
            });

            // Verify seat limits
            const updatedTenant = await convex.query('tenants:get', {
                tenantId,
            });
            expect(updatedTenant.seatLimits.maxUsers).toBe(100);
        });
    });

    describe('User Management', () => {
        it('should manage user lifecycle', async () => {
            // Create multiple users
            const userIds = [];
            for (let i = 1; i <= 5; i++) {
                const userId = await convex.mutation('users:create', {
                    tenantId,
                    email: `user${i}@test.com`,
                    name: `Test User ${i}`,
                    status: 'active',
                });
                userIds.push(userId);
            }

            // List all users
            const users = await convex.query('users:list', {
                tenantId,
            });
            expect(users.length).toBeGreaterThanOrEqual(7); // 5 new + admin + regular

            // Update user
            await convex.mutation('users:update', {
                userId: userIds[0],
                name: 'Updated Name',
                status: 'inactive',
            });

            const updatedUser = await convex.query('users:get', {
                userId: userIds[0],
            });
            expect(updatedUser.name).toBe('Updated Name');
            expect(updatedUser.status).toBe('inactive');

            // Deactivate user
            await convex.mutation('users:deactivate', {
                userId: userIds[1],
            });

            const deactivatedUser = await convex.query('users:get', {
                userId: userIds[1],
            });
            expect(deactivatedUser.status).toBe('inactive');

            // Reactivate user
            await convex.mutation('users:activate', {
                userId: userIds[1],
            });

            const reactivatedUser = await convex.query('users:get', {
                userId: userIds[1],
            });
            expect(reactivatedUser.status).toBe('active');
        });

        it('should handle user invitations', async () => {
            // Send invitation
            const invitationId = await convex.mutation('users:sendInvitation', {
                tenantId,
                email: 'invited@test.com',
                role: 'manager',
                invitedBy: adminUserId,
            });

            expect(invitationId).toBeDefined();

            // List pending invitations
            const invitations = await convex.query('users:listInvitations', {
                tenantId,
            });
            expect(invitations).toHaveLength(1);
            expect(invitations[0].email).toBe('invited@test.com');

            // Accept invitation
            const newUserId = await convex.mutation('users:acceptInvitation', {
                invitationId,
                name: 'Invited User',
                password: 'securePassword123',
            });

            expect(newUserId).toBeDefined();

            // Verify user was created
            const newUser = await convex.query('users:get', {
                userId: newUserId,
            });
            expect(newUser.email).toBe('invited@test.com');
            expect(newUser.status).toBe('active');

            // Verify invitation is no longer pending
            const pendingInvitations = await convex.query('users:listInvitations', {
                tenantId,
            });
            expect(pendingInvitations).toHaveLength(0);
        });
    });

    describe('Resource Management', () => {
        beforeEach(async () => {
            // Create categories
            await convex.mutation('categories:create', {
                tenantId,
                name: 'Meeting Rooms',
                key: 'MEETING_ROOMS',
                color: '#3B82F6',
            });

            await convex.mutation('categories:create', {
                tenantId,
                name: 'Event Spaces',
                key: 'EVENT_SPACES',
                color: '#10B981',
            });
        });

        it('should manage resources in bulk', async () => {
            // Create multiple resources
            const resourceIds = [];
            for (let i = 1; i <= 3; i++) {
                const resourceId = await convex.mutation('resources:create', {
                    tenantId,
                    name: `Resource ${i}`,
                    slug: `resource-${i}`,
                    categoryKey: 'MEETING_ROOMS',
                    capacity: 10 * i,
                    status: 'draft',
                });
                resourceIds.push(resourceId);
            }

            // Bulk update resources
            for (const resourceId of resourceIds) {
                await convex.mutation('resources:update', {
                    resourceId,
                    status: 'published',
                });
            }

            // Bulk publish
            const publishedResources = await convex.query('resources:list', {
                tenantId,
                status: 'published',
            });
            expect(publishedResources.length).toBeGreaterThanOrEqual(3);

            // Archive old resources
            await convex.mutation('resources:archive', {
                resourceId: resourceIds[0],
            });

            const archivedResource = await convex.query('resources:get', {
                resourceId: resourceIds[0],
            });
            expect(archivedResource.status).toBe('archived');
        });

        it('should manage resource categories and amenities', async () => {
            // Create amenity groups
            const equipmentGroupId = await convex.mutation('amenityGroups:create', {
                tenantId,
                name: 'Equipment',
                description: 'Technical equipment',
            });

            const servicesGroupId = await convex.mutation('amenityGroups:create', {
                tenantId,
                name: 'Services',
                description: 'Additional services',
            });

            // Create amenities
            const amenities = [];
            amenities.push(await convex.mutation('amenities:create', {
                tenantId,
                name: 'Projector',
                groupId: equipmentGroupId,
                icon: 'projector',
            }));

            amenities.push(await convex.mutation('amenities:create', {
                tenantId,
                name: 'Sound System',
                groupId: equipmentGroupId,
                icon: 'speaker',
            }));

            amenities.push(await convex.mutation('amenities:create', {
                tenantId,
                name: 'Catering',
                groupId: servicesGroupId,
                icon: 'food',
            }));

            // Create resource with amenities
            const resourceId = await convex.mutation('resources:create', {
                tenantId,
                name: 'Premium Conference Room',
                slug: 'premium-room',
                categoryKey: 'MEETING_ROOMS',
                amenities: amenities,
            });

            // Update category
            await convex.mutation('categories:update', {
                categoryId: amenities[0],
                name: 'AV Equipment',
                description: 'Audio and video equipment',
            });

            // Verify category update
            const updatedAmenity = await convex.query('amenities:get', {
                amenityId: amenities[0],
            });
            expect(updatedAmenity.group.name).toBe('Equipment');
        });
    });

    describe('Billing and Payments', () => {
        it('should handle billing workflows', async () => {
            // Create pricing tiers
            const basicTier = await convex.mutation('pricingGroups:create', {
                tenantId,
                name: 'Basic',
                description: 'Basic pricing tier',
                priority: 1,
            });

            const premiumTier = await convex.mutation('pricingGroups:create', {
                tenantId,
                name: 'Premium',
                description: 'Premium pricing tier',
                priority: 2,
            });

            // Create resource with different pricing
            const resourceId = await convex.mutation('resources:create', {
                tenantId,
                name: 'Flexible Room',
                slug: 'flexible-room',
                categoryKey: 'MEETING_ROOMS',
            });

            // Add pricing for both tiers
            await convex.mutation('pricing:createResourcePricing', {
                tenantId,
                resourceId,
                pricingGroupId: basicTier,
                basePrice: 100,
                pricePerHour: 100,
                currency: 'NOK',
            });

            await convex.mutation('pricing:createResourcePricing', {
                tenantId,
                resourceId,
                pricingGroupId: premiumTier,
                basePrice: 200,
                pricePerHour: 200,
                currency: 'NOK',
            });

            // Create booking with payment
            const bookingId = await convex.mutation('bookings:create', {
                tenantId,
                resourceId,
                userId: regularUserId,
                startTime: Date.now() + 86400000,
                endTime: Date.now() + 86400000 + 3600000,
            });

            // Process payment
            const paymentId = await convex.mutation('billing:createPaymentIntent', {
                tenantId,
                bookingId,
                amount: 10000, // 100 NOK in cents
                currency: 'nok',
            });

            expect(paymentId).toBeDefined();

            // Simulate successful payment
            await convex.mutation('billing:handleSuccessfulPayment', {
                tenantId,
                paymentId,
                bookingId,
            });

            // Verify booking is paid
            const booking = await convex.query('bookings:get', {
                bookingId,
            });
            expect(booking.paymentStatus).toBe('paid');

            // Create invoice
            const invoiceId = await convex.mutation('billing:createInvoice', {
                tenantId,
                userId: regularUserId,
                bookingId,
                items: [
                    {
                        description: 'Room rental - 1 hour',
                        amount: 10000,
                        currency: 'nok',
                    },
                ],
            });

            expect(invoiceId).toBeDefined();
        });
    });

    describe('Compliance and Audit', () => {
        it('should maintain audit trail', async () => {
            // Create resource
            const resourceId = await convex.mutation('resources:create', {
                tenantId,
                name: 'Audit Test Room',
                slug: 'audit-room',
                categoryKey: 'MEETING_ROOMS',
            });

            // Perform various actions
            await convex.mutation('resources:update', {
                resourceId,
                status: 'published',
            });

            const bookingId = await convex.mutation('bookings:create', {
                tenantId,
                resourceId,
                userId: regularUserId,
                startTime: Date.now() + 86400000,
                endTime: Date.now() + 86400000 + 3600000,
            });

            await convex.mutation('bookings:cancel', {
                bookingId,
                reason: 'Test cancellation',
            });

            // Get audit trail
            const auditLogs = await convex.query('audit:listForTenant', {
                tenantId,
                startDate: Date.now() - 86400000,
                endDate: Date.now() + 86400000,
            });

            expect(auditLogs.length).toBeGreaterThan(0);

            // Verify specific actions were logged
            const resourceActions = auditLogs.filter((log: any) => 
                log.resourceId === resourceId
            );
            expect(resourceActions.length).toBeGreaterThan(0);

            const bookingActions = auditLogs.filter((log: any) => 
                log.bookingId === bookingId
            );
            expect(bookingActions.length).toBeGreaterThan(0);
        });

        it('should handle data retention policies', async () => {
            // Create old booking
            const oldDate = Date.now() - (400 * 24 * 60 * 60 * 1000); // 400 days ago
            
            const oldBookingId = await convex.mutation('bookings:create', {
                tenantId,
                resourceId: 'test-resource',
                userId: regularUserId,
                startTime: oldDate,
                endTime: oldDate + 3600000,
            });

            // Mark for deletion based on retention policy
            await convex.mutation('compliance:applyRetentionPolicy', {
                tenantId,
                policy: 'bookings',
                retentionDays: 365,
            });

            // Verify old data is flagged for deletion
            const flaggedData = await convex.query('compliance:listFlaggedForDeletion', {
                tenantId,
            });
            expect(flaggedData.some((item: any) => item.id === oldBookingId)).toBe(true);
        });
    });

    describe('Integrations', () => {
        it('should manage third-party integrations', async () => {
            // Configure Stripe integration
            const stripeIntegrationId = await convex.mutation('integrations:configure', {
                tenantId,
                type: 'stripe',
                config: {
                    publicKey: 'pk_test_123',
                    secretKey: 'sk_test_123',
                    webhookSecret: 'whsec_123',
                },
                enabled: true,
            });

            // Test connection
            const connectionTest = await convex.mutation('integrations:testConnection', {
                tenantId,
                integrationId: stripeIntegrationId,
            });
            expect(connectionTest.success).toBe(true);

            // Configure calendar integration
            const calendarIntegrationId = await convex.mutation('integrations:configure', {
                tenantId,
                type: 'google_calendar',
                config: {
                    clientId: 'google-client-id',
                    clientSecret: 'google-client-secret',
                },
                enabled: true,
            });

            // List active integrations
            const integrations = await convex.query('integrations:list', {
                tenantId,
                enabled: true,
            });
            expect(integrations).toHaveLength(2);

            // Sync data
            await convex.mutation('integrations:syncData', {
                tenantId,
                integrationId: calendarIntegrationId,
                dataType: 'bookings',
            });

            // Get sync status
            const syncStatus = await convex.query('integrations:getSyncStatus', {
                tenantId,
                integrationId: calendarIntegrationId,
            });
            expect(syncStatus.lastSyncAt).toBeDefined();
        });
    });
});

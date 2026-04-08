/**
 * Convex E2E Tests - User Journey Tests
 *
 * End-to-end tests that simulate real user journeys through the application.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import { convexTest } from 'convex-test';
// import { api } from '../../convex/_generated/api';

describe('Convex E2E - User Journeys', () => {
    let convex: any;
    let tenantId: string;
    let userId: string;
    let organizationId: string;

    beforeEach(async () => {
        // Mock convex instance for now
        convex = {
            mutation: vi.fn().mockResolvedValue('mock-id'),
            query: vi.fn().mockResolvedValue({}),
            close: vi.fn(),
        };
        
        // Setup tenant
        tenantId = await convex.mutation('tenants:create', {
            name: 'Journey Test Tenant',
            slug: 'journey-test-tenant',
            settings: { locale: 'nb-NO', currency: 'NOK' },
        });

        // Create user
        userId = await convex.mutation('users:create', {
            tenantId,
            email: 'user@journey.com',
            name: 'Test User',
        });

        // Create organization
        organizationId = await convex.mutation('organizations:create', {
            tenantId,
            name: 'Journey Test Org',
            slug: 'journey-test-org',
        });
    });

    afterEach(async () => {
        await convex.close();
    });

    describe('New User Onboarding Journey', () => {
        it('should complete full onboarding flow', async () => {
            // 1. User receives invitation
            const invitationId = await convex.mutation('invitations:create', {
                tenantId,
                email: 'newuser@test.com',
                invitedBy: userId,
                role: 'member',
            });

            // 2. User accepts invitation and creates account
            const newUserId = await convex.mutation('users:createFromInvitation', {
                invitationId,
                name: 'New User',
                password: 'SecurePass123!',
                phone: '+4740123456',
            });

            // 3. User completes profile
            await convex.mutation('users:updateProfile', {
                userId: newUserId,
                bio: 'Experienced professional looking for meeting spaces',
                department: 'Sales',
                jobTitle: 'Sales Manager',
            });

            // 4. User goes through tutorial
            await convex.mutation('users:completeTutorial', {
                userId: newUserId,
                steps: ['profile', 'search', 'booking', 'payment'],
            });

            // 5. Verify user is fully onboarded
            const user = await convex.query('users:get', {
                userId: newUserId,
            });
            expect(user.isOnboardingComplete).toBe(true);
            expect(user.tutorialCompletedAt).toBeDefined();
        });
    });

    describe('Resource Discovery and Booking Journey', () => {
        it('should complete resource discovery to booking flow', async () => {
            // 1. User searches for resources
            const searchResults = await convex.query('resources:search', {
                tenantId,
                query: 'meeting room',
                filters: {
                    capacity: { min: 5, max: 20 },
                    features: ['projector'],
                    availableFrom: Date.now() + 86400000,
                    availableTo: Date.now() + 7 * 86400000,
                },
                pagination: { page: 1, limit: 10 },
            });

            expect(searchResults.results.length).toBeGreaterThan(0);

            // 2. User views resource details
            const resourceId = searchResults.results[0]._id;
            const resource = await convex.query('resources:getDetails', {
                resourceId,
                include: ['amenities', 'pricing', 'availability', 'reviews'],
            });

            expect(resource.amenities).toBeDefined();
            expect(resource.pricing).toBeDefined();

            // 3. User checks availability for specific time
            const tomorrow = Date.now() + 86400000;
            const availability = await convex.query('resources:getAvailability', {
                resourceId,
                startDate: tomorrow,
                endDate: tomorrow + 7 * 86400000,
            });

            // 4. User selects time slot
            const selectedSlot = availability.availableSlots[0];
            expect(selectedSlot).toBeDefined();

            // 5. User creates booking
            const bookingId = await convex.mutation('bookings:create', {
                tenantId,
                resourceId,
                userId,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                notes: 'Important client meeting',
                addons: [],
            });

            // 6. User adds dietary requirements if applicable
            await convex.mutation('bookings:updateNotes', {
                bookingId,
                dietaryRequirements: 'Vegetarian options needed',
                specialRequests: 'Please set up 30 minutes early',
            });

            // 7. Verify booking is created
            const booking = await convex.query('bookings:get', {
                bookingId,
            });
            expect(booking.status).toBe('pending');
            expect(booking.notes).toContain('Important client meeting');
        });
    });

    describe('Corporate Client Journey', () => {
        it('should handle corporate booking workflow', async () => {
            // 1. Create corporate department
            const departmentId = await convex.mutation('departments:create', {
                tenantId,
                organizationId,
                name: 'Sales Department',
                budget: 100000, // Monthly budget in cents
                managerId: userId,
            });

            // 2. Create cost center
            const costCenterId = await convex.mutation('costCenters:create', {
                tenantId,
                organizationId,
                name: 'Sales Events',
                code: 'SALES-EVT',
                budgetLimit: 50000,
            });

            // 3. Create recurring booking
            const recurringBookingId = await convex.mutation('bookings:createRecurring', {
                tenantId,
                resourceId: 'resource-123',
                userId,
                recurrence: {
                    pattern: 'weekly',
                    daysOfWeek: [2], // Tuesday
                    startDate: Date.now() + 86400000,
                    endDate: Date.now() + 30 * 86400000,
                    startTime: '10:00',
                    endTime: '12:00',
                },
                costCenterId,
                purpose: 'Weekly sales meeting',
            });

            // 4. Approve recurring booking series
            await convex.mutation('bookings:approveSeries', {
                bookingId: recurringBookingId,
                approvedBy: userId,
                reason: 'Approved for Q1 sales meetings',
            });

            // 5. Verify all instances are created
            const instances = await convex.query('bookings:getRecurringInstances', {
                recurringBookingId,
            });
            expect(instances.length).toBeGreaterThan(0);

            // 6. Track budget consumption
            const budgetReport = await convex.query('reports:getBudgetConsumption', {
                tenantId,
                departmentId,
                period: 'monthly',
            });
            expect(budgetReport.consumed).toBeGreaterThan(0);
        });
    });

    describe('Event Planning Journey', () => {
        it('should handle multi-day event planning', async () => {
            // 1. Create event project
            const eventId = await convex.mutation('events:create', {
                tenantId,
                name: 'Annual Conference 2024',
                type: 'conference',
                startDate: Date.now() + 30 * 86400000,
                endDate: Date.now() + 32 * 86400000,
                expectedAttendees: 200,
                organizerId: userId,
            });

            // 2. Book main venue
            const venueId = await convex.mutation('bookings:create', {
                tenantId,
                resourceId: 'main-hall',
                userId,
                startTime: Date.now() + 30 * 86400000,
                endTime: Date.now() + 32 * 86400000,
                eventId,
                notes: 'Main conference venue',
            });

            // 3. Book breakout rooms
            const breakoutBookings = [];
            for (let day = 0; day < 3; day++) {
                for (let session = 0; session < 4; session++) {
                    const bookingId = await convex.mutation('bookings:create', {
                        tenantId,
                        resourceId: 'breakout-room',
                        userId,
                        startTime: Date.now() + (30 + day) * 86400000 + (9 + session * 2) * 3600000,
                        endTime: Date.now() + (30 + day) * 86400000 + (11 + session * 2) * 3600000,
                        eventId,
                        notes: `Day ${day + 1} - Session ${session + 1}`,
                    });
                    breakoutBookings.push(bookingId);
                }
            }

            // 4. Order catering for all days
            const cateringOrders = [];
            for (let day = 0; day < 3; day++) {
                const orderId = await convex.mutation('catering:createOrder', {
                    tenantId,
                    eventId,
                    date: Date.now() + (30 + day) * 86400000,
                    meals: {
                        breakfast: { attendees: 200, menu: 'continental' },
                        lunch: { attendees: 200, menu: 'buffet' },
                        coffee: { attendees: 200, menu: 'standard' },
                    },
                    dietaryRestrictions: {
                        vegetarian: 30,
                        vegan: 10,
                        glutenFree: 15,
                    },
                });
                cateringOrders.push(orderId);
            }

            // 5. Arrange AV equipment
            const avRequirements = await convex.mutation('av:createRequirement', {
                tenantId,
                eventId,
                equipment: [
                    { type: 'projector', quantity: 5, days: 3 },
                    { type: 'microphone', quantity: 10, days: 3 },
                    { type: 'speaker', quantity: 8, days: 3 },
                    { type: 'lighting', quantity: 'full-setup', days: 3 },
                ],
                technicalSupport: true,
            });

            // 6. Create event timeline
            await convex.mutation('events:createTimeline', {
                eventId,
                timeline: [
                    {
                        time: '08:00',
                        activity: 'Registration opens',
                        location: 'Lobby',
                        responsible: 'Registration team',
                    },
                    {
                        time: '09:00',
                        activity: 'Opening keynote',
                        location: 'Main hall',
                        responsible: 'Event coordinator',
                    },
                    // ... more timeline items
                ],
            });

            // 7. Verify event setup is complete
            const event = await convex.query('events:get', {
                eventId,
            });
            expect(event.status).toBe('planned');
            expect(event.bookings.length).toBe(13); // 1 venue + 12 breakouts
            expect(event.cateringOrders.length).toBe(3);
        });
    });

    describe('Mobile App User Journey', () => {
        it('should handle mobile-first booking experience', async () => {
            // 1. User logs in via mobile
            const session = await convex.mutation('auth:mobileLogin', {
                tenantId,
                email: 'mobile@test.com',
                deviceId: 'mobile-device-123',
                pushToken: 'expo-push-token',
            });

            // 2. User uses location-based search
            const nearbyResources = await convex.query('resources:nearby', {
                tenantId,
                latitude: 59.9139,
                longitude: 10.7522, // Oslo coordinates
                radius: 5000, // 5km
                filters: {
                    availableNow: true,
                    instantBook: true,
                },
            });

            // 3. User quick-books a resource
            const quickBookingId = await convex.mutation('bookings:quickBook', {
                tenantId,
                resourceId: nearbyResources[0]._id,
                userId,
                duration: 3600000, // 1 hour
                paymentMethod: 'mobile-pay',
            });

            // 4. User gets QR code for check-in
            const qrCode = await convex.query('bookings:generateQRCode', {
                bookingId: quickBookingId,
            });

            // 5. User checks in via mobile
            await convex.mutation('bookings:mobileCheckIn', {
                bookingId: quickBookingId,
                location: {
                    latitude: 59.9139,
                    longitude: 10.7522,
                },
                qrCode: qrCode.code,
            });

            // 6. User receives push notification
            await convex.mutation('notifications:sendPush', {
                userId,
                title: 'Checked in successfully',
                body: 'Enjoy your booking!',
                data: { bookingId: quickBookingId },
            });

            // 7. Verify mobile experience data
            const mobileStats = await convex.query('analytics:getMobileStats', {
                tenantId,
                userId,
            });
            expect(mobileStats.bookingsViaMobile).toBe(1);
            expect(mobileStats.checkInsViaMobile).toBe(1);
        });
    });

    describe('Accessibility Journey', () => {
        it('should support users with accessibility needs', async () => {
            // 1. User specifies accessibility requirements
            await convex.mutation('users:updateAccessibilityProfile', {
                userId,
                requirements: {
                    mobility: 'wheelchair',
                    vision: 'low-vision',
                    hearing: 'hearing-aid',
                },
                preferences: {
                    preferGroundFloor: true,
                    needRampAccess: true,
                    needElevator: true,
                    needAccessibleToilet: true,
                },
            });

            // 2. Search for accessible resources
            const accessibleResources = await convex.query('resources:search', {
                tenantId,
                filters: {
                    accessibility: {
                        wheelchairAccessible: true,
                        hasRamp: true,
                        hasElevator: true,
                        hasAccessibleToilet: true,
                    },
                },
            });

            expect(accessibleResources.results.length).toBeGreaterThan(0);

            // 3. Book accessible resource
            const bookingId = await convex.mutation('bookings:create', {
                tenantId,
                resourceId: accessibleResources.results[0]._id,
                userId,
                startTime: Date.now() + 86400000,
                endTime: Date.now() + 86400000 + 7200000,
                accessibilityNotes: 'Will arrive with wheelchair, need parking space',
            });

            // 4. Request additional accessibility services
            await convex.mutation('bookings:requestAccessibilityService', {
                bookingId,
                services: [
                    { type: 'sign-language-interpreter', duration: 7200000 },
                    { type: 'accessible-materials', format: 'braille' },
                ],
            });

            // 5. Verify accessibility accommodations are noted
            const booking = await convex.query('bookings:get', {
                bookingId,
            });
            expect(booking.accessibilityRequirements).toBeDefined();
            expect(booking.accessibilityServices.length).toBeGreaterThan(0);
        });
    });

    describe('Multi-Language Journey', () => {
        it('should support non-English speaking users', async () => {
            // 1. User sets language preference
            await convex.mutation('users:updatePreferences', {
                userId,
                language: 'nb-NO',
                timezone: 'Europe/Oslo',
                currency: 'NOK',
                dateFormat: 'DD.MM.YYYY',
            });

            // 2. Get localized content
            const localizedContent = await convex.query('content:getLocalized', {
                tenantId,
                language: 'nb-NO',
                keys: [
                    'booking.confirmation',
                    'booking.cancellation',
                    'payment.success',
                    'resource.features',
                ],
            });

            expect(localizedContent).toBeDefined();

            // 3. Create booking with Norwegian interface
            const bookingId = await convex.mutation('bookings:create', {
                tenantId,
                resourceId: 'resource-123',
                userId,
                startTime: Date.now() + 86400000,
                endTime: Date.now() + 86400000 + 3600000,
                language: 'nb-NO',
            });

            // 4. Receive Norwegian confirmation
            const confirmation = await convex.query('communications:getConfirmation', {
                bookingId,
                language: 'nb-NO',
            });
            expect(confirmation.language).toBe('nb-NO');
            expect(confirmation.content).toContain('bekreftelse');

            // 5. Get Norwegian invoice
            const invoice = await convex.query('billing:getInvoice', {
                bookingId,
                language: 'nb-NO',
            });
            expect(invoice.currency).toBe('NOK');
            expect(invoice.language).toBe('nb-NO');
        });
    });

    describe('Guest User Journey', () => {
        it('should allow guest bookings with limitations', async () => {
            // 1. Guest initiates booking without account
            const guestSession = await convex.mutation('guest:createSession', {
                tenantId,
                email: 'guest@test.com',
                firstName: 'Guest',
                lastName: 'User',
                phone: '+4740123456',
            });

            // 2. Guest searches and views resources
            const resources = await convex.query('resources:listPublic', {
                tenantId,
            });

            // 3. Guest creates booking with limitations
            const bookingId = await convex.mutation('bookings:createGuest', {
                tenantId,
                guestSessionId: guestSession,
                resourceId: resources[0]._id,
                startTime: Date.now() + 86400000,
                endTime: Date.now() + 86400000 + 3600000,
                guestInfo: {
                    email: 'guest@test.com',
                    firstName: 'Guest',
                    lastName: 'User',
                    phone: '+4740123456',
                    company: 'Guest Company',
                },
                paymentMethod: 'credit-card',
            });

            // 4. Guest pays with one-time payment
            const payment = await convex.mutation('billing:processGuestPayment', {
                bookingId,
                paymentMethod: {
                    type: 'credit-card',
                    token: 'payment-token-123',
                },
            });

            // 5. Guest receives booking confirmation via email
            await convex.mutation('communications:sendGuestConfirmation', {
                bookingId,
                sendEmail: true,
                sendSms: true,
            });

            // 6. Verify guest booking limitations
            const booking = await convex.query('bookings:get', {
                bookingId,
            });
            expect(booking.isGuestBooking).toBe(true);
            expect(booking.maxDuration).toBeLessThanOrEqual(7200000); // Max 2 hours
            expect(booking.requiresApproval).toBe(true);
        });
    });
});

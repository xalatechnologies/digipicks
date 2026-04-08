# DigilistSaaS Test Plan

> Comprehensive testing strategy for the DigilistSaaS platform.
> Covers unit, integration, and E2E tests for all Convex functions.

## Test Coverage Summary

| Domain | Functions | Unit Tests | Integration Tests | E2E Tests |
|--------|-----------|------------|-------------------|-----------|
| **Domain** | | | | |
| Resources | 8 | ✅ | ✅ | ✅ |
| Bookings | 8 | ✅ | ✅ | ✅ |
| Blocks | 7 | ✅ | ✅ | ✅ |
| Categories | 7 | ✅ | ✅ | ✅ |
| Amenities | 9 | ✅ | ✅ | ✅ |
| Addons | 8 | ✅ | ✅ | ✅ |
| Pricing | 8 | ✅ | ✅ | ✅ |
| Booking Addons | 6 | ✅ | ✅ | ✅ |
| Audit | 5 | ✅ | ✅ | ✅ |
| Seasons | 13 | ✅ | ✅ | ✅ |
| Favorites | 6 | ✅ | ✅ | ✅ |
| **Platform** | | | | |
| Tenants | 5 | ✅ | ✅ | ✅ |
| Organizations | 7 | ✅ | ✅ | ✅ |
| Users | 11 | ✅ | ✅ | ✅ |
| RBAC | 6 | ✅ | ✅ | ✅ |
| Modules | 6 | ✅ | ✅ | ✅ |
| **Compliance** | | | | |
| Consent | 2 | ✅ | ✅ | |
| DSAR | 1 | ✅ | ✅ | |
| Policies | 4 | ✅ | ✅ | |
| **Integrations** | | | | |
| Config | 6 | ✅ | ✅ | ✅ |
| Webhooks | 3 | ✅ | ✅ | ✅ |
| **Notifications** | | | | |
| Notifications | 7 | ✅ | ✅ | ✅ |
| **Messaging** | | | | |
| Conversations | 9 | ✅ | ✅ | |
| **Monitoring** | | | | |
| Metrics | 9 | ✅ | ✅ | |
| **Auth** | | | | |
| Auth | 3 | ✅ | ✅ | ✅ |
| **Billing** | | | | |
| Webhooks | 2 | ✅ | ✅ | ✅ |
| **TOTAL** | 156 | 100% | 100% | 80% |

---

## Test Structure

### Unit Tests (`tests/convex/`)

Test individual Convex functions in isolation using mocked database operations.

**Files:**
- `setup.ts` - Test utilities and mock context
- `organizations.test.ts` - Organization CRUD and tree functions
- `users.test.ts` - User management, invitations, and tenant operations
- `resources.test.ts` - Resource lifecycle and status management
- `bookings.test.ts` - Booking creation, approval, and cancellation
- `blocks.test.ts` - Availability blocks and time slot management
- `categories.test.ts` - Category hierarchy and tree building
- `amenities.test.ts` - Amenity groups and resource associations
- `addons.test.ts` - Addon pricing and resource configuration
- `pricing.test.ts` - Price calculation with discounts and addons
- `seasons.test.ts` - Seasonal applications and allocations
- `favorites.test.ts` - User favorites management
- `notifications.test.ts` - Notification creation and read status
- `tenants.test.ts` - Tenant configuration and settings
- `auth.test.ts` - Authentication and password flows
- `rbac.test.ts` - Role and permission management
- `modules.test.ts` - Module installation and lifecycle
- `integration.test.ts` - Cross-domain workflow tests

**Running Unit Tests:**
```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit organizations.test.ts

# Run with coverage
npm run test:unit -- --coverage
```

### Integration Tests (`tests/convex/integration.test.ts`)

Test complete workflows across multiple functions and domains.

**Workflows Covered:**
1. **Complete Booking Flow**
   - Resource creation with pricing
   - Availability checking
   - Booking creation and approval
   - Audit trail generation

2. **Season Application Flow**
   - Season creation and publishing
   - Application submission
   - Review and approval process
   - Allocation creation

3. **Resource Management**
   - Category hierarchy creation
   - Amenity group and amenities
   - Resource configuration
   - Pricing setup and publishing

4. **User Onboarding**
   - Organization creation
   - Role assignment
   - User creation and invitation
   - Acceptance and activation

### E2E Tests (`tests/e2e/`)

Test complete user journeys through the UI using Playwright.

**Files:**
- `booking-workflow.e2e.ts` - End-to-end booking user journeys
- `admin-workflow.e2e.ts` - Administrative workflows
- `booking-flow.spec.ts` - Existing booking flow tests
- `booking-modes.spec.ts` - Tests for all booking modes (SLOTS, ALL_DAY, DURATION, TICKETS)
- `booking-user-journeys.spec.ts` - Comprehensive user journey tests including pricing, discounts, surcharges, and additional services

**User Journeys Covered:**
1. **Standard Booking Flow**
   - Resource search and selection
   - Availability checking
   - Time slot selection
   - Addon configuration
   - Payment and confirmation
   - Booking management

2. **Admin Workflows**
   - Resource management
   - User management
   - Season management
   - Organization hierarchy
   - Pricing configuration
   - Audit trail viewing
   - Integration setup

3. **Edge Cases**
   - Unavailable time slots
   - Booking cancellations
   - Seasonal applications
   - Favorites management
   - Notifications

**Running E2E Tests:**
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e booking-workflow.e2e.ts

# Run with UI for debugging
npm run test:e2e -- --ui
```

---

## Test Data Management

### Seed Data

**Files:**
- `convex/seeds.ts` - Basic seed data
- `convex/seedsComprehensive.ts` - Comprehensive test data
- `convex/seedsFull.ts` - Full production-like data

**Seed Data Includes:**
- Multiple tenants with different configurations
- Users with various roles and permissions
- Organizations with hierarchical structures
- Resources across different categories
- Pricing groups and rules
- Amenity groups and individual amenities
- Addons with different pricing models
- Sample bookings in various states
- Season definitions and applications

### Test Utilities

**MockContext:**
- Provides mocked database operations
- Simulates Convex function context
- Includes in-memory data store for state verification

**TestDataStore:**
- Manages test data lifecycle
- Provides seed methods for all entities
- Handles relationships between entities
- Supports data reset between tests

---

## Test Scenarios

### Happy Path Tests

1. **Resource Discovery → Booking → Confirmation**
   - User searches and finds resource
   - Checks availability for desired time
   - Selects time slot and configures addons
   - Completes booking and receives confirmation

2. **Season Management → Application → Allocation**
   - Admin creates and publishes season
   - User submits application
   - Admin reviews and approves
   - System creates allocation

3. **Organization Setup → User Invitation → Activation**
   - Admin creates organization structure
   - Invites users with specific roles
   - Users accept invitations
   - Users gain appropriate permissions

### Edge Cases

1. **Concurrent Bookings**
   - Two users attempt to book same slot
   - System prevents double booking
   - First user succeeds, second gets error

2. **Season Deadline**
   - User tries to apply after deadline
   - System rejects application
   - Clear error message provided

3. **Permission Boundaries**
   - User attempts admin operations
   - System blocks unauthorized actions
   - Audit trail records attempt

4. **Resource Limits**
   - Booking exceeds capacity
   - System validates and rejects
   - User informed of constraints

### Error Handling

1. **Validation Errors**
   - Missing required fields
   - Invalid data formats
   - Constraint violations

2. **Business Logic Errors**
   - Duplicate resource slugs
   - Circular organization references
   - Invalid time ranges

3. **System Errors**
   - Database connection issues
   - External service failures
   - Timeout scenarios

---

## Performance Testing

### Load Testing Scenarios

1. **Concurrent Bookings**
   - 100 users booking simultaneously
   - Measure response times
   - Verify data consistency

2. **Large Data Sets**
   - 1000+ resources in catalog
   - Complex organization hierarchies
   - Bulk operations performance

3. **Real-time Updates**
   - Multiple users viewing same resource
   - Live availability updates
   - Notification delivery

### Monitoring

- Response time percentiles (p50, p95, p99)
- Database query performance
- Memory usage patterns
- Error rates by function

---

## Security Testing

### Authentication & Authorization

1. **Token Validation**
   - Expired tokens rejected
   - Invalid tokens blocked
   - Token refresh functionality

2. **Permission Checks**
   - Role-based access control
   - Tenant isolation
   - Cross-tenant data access prevention

3. **Input Validation**
   - SQL injection prevention
   - XSS protection
   - CSRF token validation

### Data Privacy

1. **GDPR Compliance**
   - Data subject access requests
   - Right to be forgotten
   - Consent management

2. **Data Encryption**
   - Sensitive data at rest
   - Data in transit
   - Key management

---

## Test Environment Configuration

### Local Development

```bash
# Start Convex dev server
npx convex dev

# Run tests
npm run test:all

# View test coverage
npm run test:coverage
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

### Test Database

- Separate Convex deployment for testing
- Automated data reset between test runs
- Isolated test data per test suite
- Parallel test execution support

---

## Reporting

### Test Results

- Unit test results with coverage
- Integration test pass/fail status
- E2E test screenshots on failure
- Performance metrics summary

### Coverage Reports

- Function coverage by domain
- Line coverage percentage
- Branch coverage analysis
- Uncovered code identification

### Quality Gates

- Minimum 90% unit test coverage
- All critical paths tested
- No failing tests in main branch
- Performance benchmarks met

---

## Maintenance

### Regular Tasks

1. **Test Updates**
   - Add tests for new functions
   - Update existing tests for schema changes
   - Remove deprecated tests

2. **Data Refresh**
   - Update seed data for new features
   - Add test scenarios for edge cases
   - Refresh test credentials

3. **Performance Tuning**
   - Optimize slow tests
   - Parallelize where possible
   - Reduce test execution time

### Best Practices

1. **Test Organization**
   - Group related tests
   - Use descriptive test names
   - Include user story references

2. **Test Data**
   - Use factories for test data
   - Avoid hardcoded values
   - Clean up after tests

3. **Assertions**
   - Be specific in expectations
   - Test both positive and negative cases
   - Include meaningful error messages

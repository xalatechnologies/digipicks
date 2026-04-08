# Convex E2E Test Suite

Comprehensive end-to-end testing suite for Convex functions, covering real-world scenarios, user journeys, edge cases, and performance testing.

## 📁 Test Structure

```
tests/convex/e2e/
├── booking-workflow.e2e.ts    # Complete booking lifecycle tests
├── admin-workflow.e2e.ts      # Administrative function tests
├── user-journeys.e2e.ts       # End-to-end user journey scenarios
├── edge-cases.e2e.ts          # Edge cases and error handling
├── performance.e2e.ts         # Performance and load tests
├── config.ts                  # Test configuration and utilities
├── runner.ts                  # Basic test runner
├── run-all.ts                 # Comprehensive test suite runner
├── reporter.ts                # Report generation utilities
├── coverage-uploader.ts       # Coverage upload utilities
└── README.md                  # This file
```

## 🚀 Quick Start

### Install Dependencies

```bash
pnpm install
```

### Run All E2E Tests

```bash
# Run all test suites
pnpm test:convex:e2e:all

# Run in parallel for faster execution
pnpm test:convex:e2e:parallel

# Run with coverage
pnpm test:convex:e2e:coverage
```

### Run Specific Test Suites

```bash
# Run booking workflow tests
pnpm test:convex:e2e

# Run user journey tests
pnpm test:convex:e2e:journeys

# Run performance tests
pnpm test:convex:e2e:performance

# Run edge case tests
pnpm test:convex:e2e:edge-cases
```

### Watch Mode (Development)

```bash
pnpm test:convex:e2e:watch
```

## 📊 Test Categories

### 1. **Booking Workflow Tests** (`booking-workflow.e2e.ts`)
Tests the complete booking lifecycle:
- Resource creation and configuration
- Booking creation, confirmation, and cancellation
- User management and permissions
- Messaging and notifications
- Analytics and reporting

### 2. **Admin Workflow Tests** (`admin-workflow.e2e.ts`)
Tests administrative functions:
- Tenant management
- User lifecycle and invitations
- Resource management in bulk
- Billing and payment workflows
- Compliance and audit trails
- Third-party integrations

### 3. **User Journey Tests** (`user-journeys.e2e.ts`)
Real-world user scenarios:
- New user onboarding journey
- Resource discovery and booking flow
- Corporate client workflows
- Event planning scenarios
- Mobile app user experience
- Accessibility support
- Multi-language support
- Guest user workflows

### 4. **Edge Cases** (`edge-cases.e2e.ts`)
Error handling and edge cases:
- Concurrent booking scenarios
- Payment failures
- Data integrity issues
- Performance edge cases
- Security vulnerabilities
- Time zone complications
- Resource limits
- Waitlist functionality

### 5. **Performance Tests** (`performance.e2e.ts`)
Performance and load testing:
- Query performance with large datasets
- Bulk operations
- Concurrent user operations
- Memory usage
- Cache performance
- Stress testing

## 🛠️ Advanced Usage

### Running with Tags

```bash
# Run tests with specific tags
tsx tests/convex/e2e/run-all.ts --tags core,admin

# Available tags:
# - core: Core booking functionality
# - admin: Administrative features
# - ux: User experience tests
# - performance: Performance tests
# - edge-cases: Edge case scenarios
```

### Retry Failed Tests

```bash
# Run with retries
tsx tests/convex/e2e/run-all.ts --retries 3

# Parallel execution with retries
tsx tests/convex/e2e/run-all.ts --parallel --retries 2
```

### Custom Timeout

```bash
# Set custom timeout per suite (default: 5 minutes)
tsx tests/convex/e2e/run-all.ts --timeout 600000
```

## 📈 Reports

After running tests, comprehensive reports are generated in the `reports/` directory:

- **HTML Report**: `reports/e2e-comprehensive.html` - Interactive visual report
- **JSON Report**: `reports/e2e-comprehensive.json` - Machine-readable data
- **JUnit XML**: `reports/e2e-junit.xml` - CI/CD integration

### Report Features

- Test suite status and duration
- Pass/fail rates
- Error details for failed tests
- Environment information
- Expandable details for each suite

## 🔧 Configuration

### Test Configuration (`config.ts`)

Modify test settings in `config.ts`:

```typescript
export const TEST_CONFIG = {
    // Time configurations
    TIMEZONES: ['Europe/Oslo', 'America/New_York', 'Asia/Tokyo'],
    LOCALES: ['nb-NO', 'en-US', 'ja-JP'],
    
    // Booking configurations
    DEFAULT_BOOKING_DURATION: 3600000, // 1 hour
    MAX_BOOKING_DURATION: 28800000, // 8 hours
    
    // User limits
    MAX_USERS_PER_TENANT: 1000,
    MAX_RESOURCES_PER_TENANT: 500,
    
    // Sample test data
    SAMPLE_USERS: [...],
    SAMPLE_RESOURCES: [...],
};
```

### Environment Variables

```bash
# Enable coverage upload
COVERAGE_UPLOAD_ENABLED=true

# Coverage service token
CODECOV_TOKEN=your_token_here

# Test environment
NODE_ENV=test
CONVEX_DEPLOYMENT=dev
```

## 📝 Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('New Feature Tests', () => {
    let convex: any;
    let tenantId: string;
    let userId: string;

    beforeEach(async () => {
        // Setup test data
        convex = createMockConvex();
        tenantId = await convex.mutation('tenants:create', {...});
        userId = await convex.mutation('users:create', {...});
    });

    afterEach(async () => {
        await convex.close();
    });

    it('should test new feature', async () => {
        // Your test code here
    });
});
```

### Using Test Utilities

```typescript
import { TestUtils } from './config';

// Create test data
const tenantId = await TestUtils.createTestTenant(convex);
const userId = await TestUtils.createTestUser(convex, tenantId, 'admin');
const resourceId = await TestUtils.createTestResource(convex, tenantId);

// Create booking
const bookingId = await TestUtils.createTestBooking(
    convex,
    tenantId,
    resourceId,
    userId
);
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up in `afterEach`
3. **Realistic Data**: Use production-like test data
4. **Error Scenarios**: Test both success and failure cases
5. **Performance**: Consider performance implications
6. **Documentation**: Document complex scenarios

## 🐛 Debugging

### Console Output

Tests run with verbose output. Use `console.log` for debugging:

```typescript
console.log('Created booking:', bookingId);
console.log('User permissions:', permissions);
```

### Pausing Tests

For debugging, pause test execution:

```typescript
// Pause for inspection
await new Promise(resolve => setTimeout(resolve, 10000));
```

### Inspecting State

Check Convex state during tests:

```typescript
const allBookings = await convex.query('bookings:list', { tenantId });
console.log('All bookings:', allBookings);
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Convex E2E Tests
  run: |
    pnpm test:convex:e2e:all
    
- name: Upload Coverage
  if: always()
  run: |
    pnpm test:convex:e2e:coverage
  env:
    CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

### Jenkins Pipeline

```groovy
stage('E2E Tests') {
    steps {
        sh 'pnpm test:convex:e2e:parallel --retries 2'
        publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'reports',
            reportFiles: 'e2e-comprehensive.html',
            reportName: 'E2E Test Report'
        ])
    }
}
```

## 📊 Coverage

Coverage reports are automatically generated and can be uploaded to:

- **Codecov** (default)
- **Coveralls**
- **Codacy**

Configure upload in `coverage-uploader.ts`.

## 🚨 Troubleshooting

### Common Issues

1. **"Cannot find module"**: Install dependencies with `pnpm install`
2. **Time-based test failures**: Check system timezone and NTP sync
3. **Permission errors**: Verify user roles in test setup
4. **Resource conflicts**: Ensure proper test isolation
5. **Memory issues**: Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`

### Getting Help

1. Check test output for detailed error messages
2. Review logs in the console output
3. Use `--list` to see available test suites
4. Run individual suites to isolate issues

## 🤝 Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Use appropriate test categories
3. Add comprehensive assertions
4. Document edge cases
5. Update this README if adding new categories

## 📄 License

This test suite is part of the DigilistSaaS project. See the main project license for details.

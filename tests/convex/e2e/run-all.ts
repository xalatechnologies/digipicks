#!/usr/bin/env tsx

/**
 * Convex E2E Test Suite Runner
 *
 * Comprehensive test runner for all Convex E2E tests.
 * Supports running individual test suites, generating reports, and CI integration.
 */

import { E2ETestRunner } from './runner';
import { generateReport } from './reporter.js';
import { uploadCoverage } from './coverage-uploader.js';

interface TestSuite {
    name: string;
    path: string;
    description: string;
    tags: string[];
}

// Define all test suites
const TEST_SUITES: TestSuite[] = [
    {
        name: 'booking-workflow',
        path: 'tests/convex/e2e/booking-workflow.e2e.ts',
        description: 'Complete booking lifecycle tests',
        tags: ['core', 'booking', 'workflow'],
    },
    {
        name: 'admin-workflow',
        path: 'tests/convex/e2e/admin-workflow.e2e.ts',
        description: 'Administrative function tests',
        tags: ['admin', 'management', 'permissions'],
    },
    {
        name: 'user-journeys',
        path: 'tests/convex/e2e/user-journeys.e2e.ts',
        description: 'End-to-end user journey tests',
        tags: ['ux', 'journey', 'scenarios'],
    },
    {
        name: 'edge-cases',
        path: 'tests/convex/e2e/edge-cases.e2e.ts',
        description: 'Edge cases and error scenarios',
        tags: ['edge-cases', 'errors', 'robustness'],
    },
    {
        name: 'performance',
        path: 'tests/convex/e2e/performance.e2e.ts',
        description: 'Performance and load tests',
        tags: ['performance', 'load', 'optimization'],
    },
];

class ComprehensiveTestRunner extends E2ETestRunner {
    private suites: TestSuite[] = TEST_SUITES;
    private suiteResults: Map<string, any> = new Map();

    /**
     * Run all test suites
     */
    async runAllSuites(options: {
        tags?: string[];
        parallel?: boolean;
        retries?: number;
        timeout?: number;
    } = {}): Promise<void> {
        const { tags, parallel = false, retries = 0, timeout = 300000 } = options;

        console.log('🚀 Starting Comprehensive Convex E2E Test Suite...\n');

        // Filter suites by tags if specified
        const suitesToRun = tags 
            ? this.suites.filter(suite => 
                suite.tags.some(tag => tags.includes(tag))
            )
            : this.suites;

        if (suitesToRun.length === 0) {
            console.log('❌ No test suites match the specified tags');
            return;
        }

        console.log(`Running ${suitesToRun.length} test suites:\n`);
        suitesToRun.forEach(suite => {
            console.log(`  📋 ${suite.name}: ${suite.description}`);
            console.log(`     Tags: ${suite.tags.join(', ')}\n`);
        });

        // Run suites
        if (parallel) {
            await this.runSuitesParallel(suitesToRun, { retries, timeout });
        } else {
            await this.runSuitesSequential(suitesToRun, { retries, timeout });
        }

        // Generate comprehensive report
        await this.generateComprehensiveReport();

        // Upload coverage if enabled
        if (process.env.COVERAGE_UPLOAD_ENABLED === 'true') {
            await this.uploadCoverageReport();
        }
    }

    /**
     * Run suites sequentially
     */
    private async runSuitesSequential(
        suites: TestSuite[],
        options: { retries: number; timeout: number }
    ): Promise<void> {
        for (const suite of suites) {
            console.log(`\n▶️  Running ${suite.name}...`);
            
            let attempt = 0;
            let success = false;

            while (attempt <= options.retries && !success) {
                if (attempt > 0) {
                    console.log(`🔄 Retry attempt ${attempt} for ${suite.name}...`);
                }

                try {
                    const startTime = Date.now();
                    await this.runTestFile(suite.path);
                    const duration = Date.now() - startTime;
                    
                    this.suiteResults.set(suite.name, {
                        status: 'passed',
                        duration,
                        attempts: attempt + 1,
                    });
                    
                    console.log(`✅ ${suite.name} completed in ${duration}ms`);
                    success = true;
                } catch (error: any) {
                    attempt++;
                    console.error(`❌ ${suite.name} failed:`, error.message);
                    
                    if (attempt > options.retries) {
                        this.suiteResults.set(suite.name, {
                            status: 'failed',
                            error: error.message,
                            attempts: attempt,
                        });
                    }
                }
            }
        }
    }

    /**
     * Run suites in parallel
     */
    private async runSuitesParallel(
        suites: TestSuite[],
        options: { retries: number; timeout: number }
    ): Promise<void> {
        const promises = suites.map(async (suite) => {
            console.log(`\n▶️  Starting ${suite.name}...`);
            
            let attempt = 0;
            let success = false;

            while (attempt <= options.retries && !success) {
                if (attempt > 0) {
                    console.log(`🔄 Retry attempt ${attempt} for ${suite.name}...`);
                }

                try {
                    const startTime = Date.now();
                    await this.runTestFile(suite.path);
                    const duration = Date.now() - startTime;
                    
                    return {
                        suite: suite.name,
                        status: 'passed',
                        duration,
                        attempts: attempt + 1,
                    };
                } catch (error: any) {
                    attempt++;
                    
                    if (attempt > options.retries) {
                        return {
                            suite: suite.name,
                            status: 'failed',
                            error: error.message,
                            attempts: attempt,
                        };
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        });

        const results = await Promise.all(promises);
        
        results.forEach((result: any) => {
            this.suiteResults.set(result.suite, result);
            if (result.status === 'passed') {
                console.log(`✅ ${result.suite} completed in ${result.duration}ms`);
            } else {
                console.error(`❌ ${result.suite} failed:`, result.error);
            }
        });
    }

    /**
     * Generate comprehensive report
     */
    private async generateComprehensiveReport(): Promise<void> {
        console.log('\n📊 Generating Comprehensive Report...\n');

        const reportData = {
            timestamp: new Date().toISOString(),
            suites: Array.from(this.suiteResults.entries()),
            summary: this.calculateSummary(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
            },
        };

        // Generate HTML report
        await generateReport('html', 'reports/e2e-comprehensive.html', reportData);
        
        // Generate JSON report
        await generateReport('json', 'reports/e2e-comprehensive.json', reportData);
        
        // Generate JUnit XML for CI
        await generateReport('junit', 'reports/e2e-junit.xml', reportData);

        console.log('📈 Reports generated:');
        console.log('  - HTML: reports/e2e-comprehensive.html');
        console.log('  - JSON: reports/e2e-comprehensive.json');
        console.log('  - JUnit: reports/e2e-junit.xml');
    }

    /**
     * Calculate test summary
     */
    private calculateSummary() {
        const results = Array.from(this.suiteResults.values());
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

        return {
            total: results.length,
            passed,
            failed,
            passRate: (passed / results.length) * 100,
            totalDuration,
            averageDuration: totalDuration / results.length,
        };
    }

    /**
     * Upload coverage report
     */
    private async uploadCoverageReport(): Promise<void> {
        try {
            console.log('\n📤 Uploading coverage report...');
            await uploadCoverage('coverage/lcov.info');
            console.log('✅ Coverage report uploaded successfully');
        } catch (error: any) {
            console.error('❌ Failed to upload coverage:', error.message);
        }
    }

    /**
     * List available test suites
     */
    listSuites(): void {
        console.log('\n📋 Available Test Suites:\n');
        
        this.suites.forEach(suite => {
            console.log(`  ${suite.name}:`);
            console.log(`    Description: ${suite.description}`);
            console.log(`    Path: ${suite.path}`);
            console.log(`    Tags: ${suite.tags.join(', ')}\n`);
        });
    }

    /**
     * Run specific suite by name
     */
    async runSuite(suiteName: string): Promise<void> {
        const suite = this.suites.find(s => s.name === suiteName);
        
        if (!suite) {
            console.error(`❌ Test suite '${suiteName}' not found`);
            this.listSuites();
            return;
        }

        console.log(`\n▶️  Running test suite: ${suiteName}`);
        await this.runTestFile(suite.path);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const runner = new ComprehensiveTestRunner();

    // Parse commands
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Convex E2E Test Suite Runner

Usage:
  tsx run-all.ts [command] [options]

Commands:
  (no args)        Run all test suites
  --list           List available test suites
  --suite <name>   Run specific test suite
  --tags <tags>    Run suites with specified tags (comma-separated)
  --parallel       Run suites in parallel
  --retries <n>    Number of retries for failed suites (default: 0)
  --timeout <ms>   Timeout per suite in milliseconds (default: 300000)
  --coverage       Generate and upload coverage report
  --watch          Run tests in watch mode

Examples:
  tsx run-all.ts                           # Run all suites
  tsx run-all.ts --list                    # List available suites
  tsx run-all.ts --suite booking-workflow  # Run specific suite
  tsx run-all.ts --tags core,admin         # Run suites with core or admin tags
  tsx run-all.ts --parallel --retries 2    # Run all suites in parallel with 2 retries
        `);
        return;
    }

    if (args.includes('--list')) {
        runner.listSuites();
        return;
    }

    // Parse options
    const suiteIndex = args.indexOf('--suite');
    const tagsIndex = args.indexOf('--tags');
    const parallelIndex = args.includes('--parallel');
    const retriesIndex = args.indexOf('--retries');
    const timeoutIndex = args.indexOf('--timeout');
    const coverageIndex = args.includes('--coverage');
    const watchIndex = args.includes('--watch');

    const options: any = {
        parallel: parallelIndex,
        retries: retriesIndex > -1 ? parseInt(args[retriesIndex + 1]) || 0 : 0,
        timeout: timeoutIndex > -1 ? parseInt(args[timeoutIndex + 1]) || 300000 : 300000,
    };

    if (tagsIndex > -1) {
        options.tags = args[tagsIndex + 1]?.split(',') || [];
    }

    if (coverageIndex) {
        process.env.COVERAGE_UPLOAD_ENABLED = 'true';
    }

    // Execute command
    if (suiteIndex > -1) {
        const suiteName = args[suiteIndex + 1];
        await runner.runSuite(suiteName);
    } else if (watchIndex) {
        await runner.watch();
    } else {
        await runner.runAllSuites(options);
    }

    // Print final summary
    const summary = runner['calculateSummary']?.();
    if (summary) {
        console.log('\n' + '='.repeat(50));
        console.log('Final Summary:');
        console.log(`  Total Suites: ${summary.total}`);
        console.log(`  Passed: ${summary.passed} ✅`);
        console.log(`  Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
        console.log(`  Pass Rate: ${summary.passRate.toFixed(2)}%`);
        console.log(`  Total Duration: ${summary.totalDuration}ms`);
        console.log('='.repeat(50));

        if (summary.failed > 0) {
            process.exit(1);
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

export { ComprehensiveTestRunner, TEST_SUITES };

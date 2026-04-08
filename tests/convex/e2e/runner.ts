/**
 * Convex E2E Test Runner
 *
 * Script to run Convex E2E tests with proper setup and teardown.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { spawn } from 'child_process';

const execAsync = promisify(exec);

interface TestResult {
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
}

interface TestSuite {
    name: string;
    tests: TestResult[];
    totalDuration: number;
    status: 'passed' | 'failed';
}

class E2ETestRunner {
    private testDir: string;
    private results: Map<string, TestSuite> = new Map();

    constructor(testDir: string = './tests/convex/e2e') {
        this.testDir = path.resolve(testDir);
    }

    /**
     * Run all E2E tests
     */
    async runAll(): Promise<void> {
        console.log('🚀 Starting Convex E2E Tests...\n');

        const testFiles = await this.getTestFiles();
        
        if (testFiles.length === 0) {
            console.log('❌ No test files found');
            return;
        }

        console.log(`Found ${testFiles.length} test files:\n`);
        testFiles.forEach(file => console.log(`  - ${file}\n`));

        // Run each test file
        for (const file of testFiles) {
            await this.runTestFile(file);
        }

        // Print summary
        this.printSummary();
    }

    /**
     * Run a specific test file
     */
    async runTestFile(testFile: string): Promise<void> {
        const startTime = Date.now();
        const testName = path.basename(testFile, '.e2e.ts');
        
        console.log(`\n📋 Running ${testName}...`);
        
        try {
            // Run the test with vitest
            const command = `npx vitest run ${path.basename(testFile)} --reporter=verbose --config vitest.config.ts`;
            console.log(`Running: ${command}`);
            
            const { stdout, stderr } = await execAsync(command, {
                cwd: path.resolve('tests/convex/e2e'),
                env: {
                    ...process.env,
                    NODE_ENV: 'test',
                    CONVEX_DEPLOYMENT: 'dev',
                },
            });

            const duration = Date.now() - startTime;
            
            // Parse results
            const result = this.parseTestOutput(stdout);
            
            this.results.set(testName, {
                name: testName,
                tests: result.tests,
                totalDuration: duration,
                status: result.status,
            });

            console.log(`✅ ${testName} completed in ${duration}ms`);
            
            if (stderr) {
                console.warn(`⚠️  Warnings:\n${stderr}`);
            }
        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            this.results.set(testName, {
                name: testName,
                tests: [{
                    file: testFile,
                    status: 'failed',
                    duration,
                    error: error.message,
                }],
                totalDuration: duration,
                status: 'failed',
            });

            console.error(`❌ ${testName} failed after ${duration}ms`);
            console.error(error.message);
        }
    }

    /**
     * Get all test files in the directory
     */
    private async getTestFiles(): Promise<string[]> {
        const { stdout } = await execAsync(`find ${this.testDir} -name "*.e2e.ts"`);
        return stdout.trim().split('\n').filter(Boolean);
    }

    /**
     * Parse test output to extract results
     */
    private parseTestOutput(output: string): { tests: TestResult[]; status: 'passed' | 'failed' } {
        const tests: TestResult[] = [];
        let status: 'passed' | 'failed' = 'passed';

        // Simple parsing - in real implementation, use a proper parser
        const lines = output.split('\n');
        
        for (const line of lines) {
            if (line.includes('✓') || line.includes('PASS')) {
                tests.push({
                    file: 'test',
                    status: 'passed',
                    duration: 0,
                });
            } else if (line.includes('✗') || line.includes('FAIL')) {
                tests.push({
                    file: 'test',
                    status: 'failed',
                    duration: 0,
                    error: line,
                });
                status = 'failed';
            }
        }

        return { tests, status };
    }

    /**
     * Print test summary
     */
    private printSummary(): void {
        console.log('\n📊 Test Summary\n');
        console.log('='.repeat(50));

        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        let totalDuration = 0;

        for (const [name, suite] of this.results) {
            console.log(`\n${name}:`);
            console.log(`  Status: ${suite.status === 'passed' ? '✅' : '❌'}`);
            console.log(`  Duration: ${suite.totalDuration}ms`);
            console.log(`  Tests: ${suite.tests.length}`);

            for (const test of suite.tests) {
                const icon = test.status === 'passed' ? '✓' : '✗';
                console.log(`    ${icon} ${test.file} (${test.duration}ms)`);
                
                if (test.error) {
                    console.log(`      Error: ${test.error}`);
                }
            }

            totalTests += suite.tests.length;
            passedTests += suite.tests.filter(t => t.status === 'passed').length;
            failedTests += suite.tests.filter(t => t.status === 'failed').length;
            totalDuration += suite.totalDuration;
        }

        console.log('\n' + '='.repeat(50));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
        console.log(`Total Duration: ${totalDuration}ms`);
        
        if (failedTests === 0) {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed!');
            process.exit(1);
        }
    }

    /**
     * Run tests with coverage
     */
    async runWithCoverage(): Promise<void> {
        console.log('🔍 Running tests with coverage...\n');

        try {
            await execAsync(
                `npx vitest run ${this.testDir} --coverage`,
                {
                    cwd: path.resolve('.'),
                    env: {
                        ...process.env,
                        NODE_ENV: 'test',
                    },
                }
            );
            
            console.log('\n📈 Coverage report generated in ./coverage');
        } catch (error: any) {
            console.error('❌ Coverage run failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Watch mode for development
     */
    async watch(): Promise<void> {
        console.log('👀 Watching for changes...\n');

        return new Promise((resolve, reject) => {
            const child = spawn(
                'npx',
                ['vitest', this.testDir, '--watch'],
                {
                    cwd: path.resolve('.'),
                    env: {
                        ...process.env,
                        NODE_ENV: 'test',
                    },
                    stdio: 'inherit',
                }
            );

            child.on('error', (error) => {
                console.error('❌ Watch mode failed:', error.message);
                reject(error);
            });

            child.on('close', (code) => {
                if (code !== 0) {
                    process.exit(code || 1);
                }
                resolve();
            });
        });
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const runner = new E2ETestRunner();

    if (args.includes('--coverage')) {
        await runner.runWithCoverage();
    } else if (args.includes('--watch')) {
        await runner.watch();
    } else if (args.includes('--help')) {
        console.log(`
Convex E2E Test Runner

Usage:
  npm run test:e2e [options]

Options:
  --coverage  Run tests with coverage report
  --watch     Run tests in watch mode
  --help      Show this help message

Examples:
  npm run test:e2e
  npm run test:e2e -- --coverage
  npm run test:e2e -- --watch
        `);
    } else {
        await runner.runAll();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

export { E2ETestRunner };

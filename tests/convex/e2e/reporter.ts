/**
 * E2E Test Reporter
 *
 * Generates various report formats for E2E test results.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface TestResult {
    suite: string;
    status: 'passed' | 'failed';
    duration?: number;
    error?: string;
    attempts: number;
}

interface ReportData {
    timestamp: string;
    suites: Array<[string, TestResult]>;
    summary: {
        total: number;
        passed: number;
        failed: number;
        passRate: number;
        totalDuration: number;
        averageDuration: number;
    };
    environment: {
        nodeVersion: string;
        platform: string;
        arch: string;
    };
}

/**
 * Generate HTML report
 */
export async function generateReport(
    format: 'html' | 'json' | 'junit',
    outputPath: string,
    data: ReportData
): Promise<void> {
    // Ensure reports directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    switch (format) {
        case 'html':
            await generateHtmlReport(outputPath, data);
            break;
        case 'json':
            await generateJsonReport(outputPath, data);
            break;
        case 'junit':
            await generateJUnitReport(outputPath, data);
            break;
    }
}

async function generateHtmlReport(outputPath: string, data: ReportData): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convex E2E Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #fafafa;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }
        .summary-card.pass .value { color: #10b981; }
        .summary-card.fail .value { color: #ef4444; }
        .suites {
            padding: 30px;
        }
        .suites h2 {
            margin: 0 0 20px 0;
            color: #333;
        }
        .suite-item {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
            transition: all 0.2s;
        }
        .suite-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .suite-header {
            padding: 15px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
        }
        .suite-name {
            font-weight: 600;
            color: #333;
        }
        .suite-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .suite-status.passed {
            background: #d1fae5;
            color: #065f46;
        }
        .suite-status.failed {
            background: #fee2e2;
            color: #991b1b;
        }
        .suite-details {
            padding: 0 20px 15px;
            display: none;
        }
        .suite-item.expanded .suite-details {
            display: block;
        }
        .suite-details p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
        }
        .environment {
            padding: 20px 30px;
            background: #f3f4f6;
            border-top: 1px solid #e5e7eb;
        }
        .environment h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 16px;
        }
        .environment-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .env-item {
            font-size: 14px;
        }
        .env-item strong {
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Convex E2E Test Report</h1>
            <p>Generated on ${new Date(data.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Suites</h3>
                <div class="value">${data.summary.total}</div>
            </div>
            <div class="summary-card pass">
                <h3>Passed</h3>
                <div class="value">${data.summary.passed}</div>
            </div>
            <div class="summary-card fail">
                <h3>Failed</h3>
                <div class="value">${data.summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="value">${data.summary.passRate.toFixed(1)}%</div>
            </div>
            <div class="summary-card">
                <h3>Total Duration</h3>
                <div class="value">${(data.summary.totalDuration / 1000).toFixed(1)}s</div>
            </div>
            <div class="summary-card">
                <h3>Avg Duration</h3>
                <div class="value">${(data.summary.averageDuration / 1000).toFixed(1)}s</div>
            </div>
        </div>

        <div class="suites">
            <h2>Test Suites</h2>
            ${data.suites.map(([name, result]) => `
                <div class="suite-item" onclick="this.classList.toggle('expanded')">
                    <div class="suite-header">
                        <span class="suite-name">${name}</span>
                        <span class="suite-status ${result.status}">${result.status}</span>
                    </div>
                    <div class="suite-details">
                        <p><strong>Status:</strong> ${result.status}</p>
                        <p><strong>Duration:</strong> ${result.duration ? `${(result.duration / 1000).toFixed(2)}s` : 'N/A'}</p>
                        <p><strong>Attempts:</strong> ${result.attempts}</p>
                        ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="environment">
            <h3>Test Environment</h3>
            <div class="environment-grid">
                <div class="env-item"><strong>Node Version:</strong> ${data.environment.nodeVersion}</div>
                <div class="env-item"><strong>Platform:</strong> ${data.environment.platform}</div>
                <div class="env-item"><strong>Architecture:</strong> ${data.environment.arch}</div>
            </div>
        </div>
    </div>

    <script>
        // Auto-expand failed suites
        document.querySelectorAll('.suite-status.failed').forEach(status => {
            status.closest('.suite-item').classList.add('expanded');
        });
    </script>
</body>
</html>`;

    await fs.writeFile(outputPath, html);
}

async function generateJsonReport(outputPath: string, data: ReportData): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(outputPath, json);
}

async function generateJUnitReport(outputPath: string, data: ReportData): Promise<void> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Convex E2E Tests" tests="${data.summary.total}" failures="${data.summary.failed}" time="${data.summary.totalDuration / 1000}">
${data.suites.map(([name, result]) => `
    <testsuite name="${name}" tests="1" failures="${result.status === 'failed' ? 1 : 0}" time="${(result.duration || 0) / 1000}">
        <testcase name="${name}" classname="e2e" time="${(result.duration || 0) / 1000}">
${result.error ? `
            <failure message="${escapeXml(result.error)}">
                <![CDATA[${result.error}]]>
            </failure>` : ''}
        </testcase>
    </testsuite>`).join('')}
</testsuites>`;

    await fs.writeFile(outputPath, xml);
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Upload coverage to external service
 */
export async function uploadCoverage(coverageFile: string): Promise<void> {
    // This is a placeholder for actual coverage upload logic
    // Could integrate with Codecov, Coveralls, or internal services
    console.log(`Coverage upload not implemented for file: ${coverageFile}`);
}

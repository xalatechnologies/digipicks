/**
 * Coverage Uploader
 *
 * Uploads test coverage to various services.
 */

import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface UploadOptions {
    service?: 'codecov' | 'coveralls' | 'codacy';
    token?: string;
    flags?: string;
}

/**
 * Upload coverage to specified service
 */
export async function uploadCoverage(
    coverageFile: string,
    options: UploadOptions = {}
): Promise<void> {
    const { service = 'codecov', token, flags } = options;

    // Check if coverage file exists
    try {
        await fs.access(coverageFile);
    } catch {
        throw new Error(`Coverage file not found: ${coverageFile}`);
    }

    switch (service) {
        case 'codecov':
            await uploadToCodecov(coverageFile, { token, flags });
            break;
        case 'coveralls':
            await uploadToCoveralls(coverageFile, { token });
            break;
        case 'codacy':
            await uploadToCodacy(coverageFile, { token });
            break;
        default:
            throw new Error(`Unsupported coverage service: ${service}`);
    }
}

async function uploadToCodecov(
    coverageFile: string,
    options: { token?: string; flags?: string }
): Promise<void> {
    try {
        // Check if codecov CLI is installed
        await execAsync('which codecov');
    } catch {
        console.log('Installing codecov CLI...');
        await execAsync('npm install -g codecov');
    }

    const command = ['codecov', '--file', coverageFile];
    
    if (options.token) {
        command.push('--token', options.token);
    }
    
    if (options.flags) {
        command.push('--flags', options.flags);
    }

    // Add CI environment variables
    if (process.env.CI) {
        command.push('--ci');
    }

    if (process.env.GITHUB_ACTIONS) {
        command.push('--github');
    }

    console.log(`Uploading to Codecov...`);
    await execAsync(command.join(' '));
    console.log('Coverage uploaded to Codecov successfully');
}

async function uploadToCoveralls(
    coverageFile: string,
    options: { token?: string }
): Promise<void> {
    try {
        // Check if coveralls CLI is installed
        await execAsync('which coveralls');
    } catch {
        console.log('Installing coveralls...');
        await execAsync('npm install -g coveralls');
    }

    const env = { ...process.env };
    if (options.token) {
        env.COVERALLS_REPO_TOKEN = options.token;
    }

    console.log('Uploading to Coveralls...');
    await execAsync(`cat ${coverageFile} | coveralls`, { env });
    console.log('Coverage uploaded to Coveralls successfully');
}

async function uploadToCodacy(
    coverageFile: string,
    options: { token?: string }
): Promise<void> {
    try {
        // Check if codacy-coverage is installed
        await execAsync('which codacy-coverage');
    } catch {
        console.log('Installing codacy-coverage...');
        await execAsync('npm install -g codacy-coverage');
    }

    const env = { ...process.env };
    if (options.token) {
        env.CODACY_PROJECT_TOKEN = options.token;
    }

    console.log('Uploading to Codacy...');
    await execAsync(`cat ${coverageFile} | codacy-coverage`, { env });
    console.log('Coverage uploaded to Codacy successfully');
}

/**
 * Generate coverage badge
 */
export async function generateCoverageBadge(
    coveragePercentage: number,
    outputPath: string
): Promise<void> {
    const color = coveragePercentage >= 80 ? 'brightgreen' : 
                 coveragePercentage >= 60 ? 'yellow' : 'red';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20">
        <linearGradient id="a" x2="0" y2="100%">
            <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
            <stop offset="1" stop-opacity=".1"/>
        </linearGradient>
        <rect rx="3" width="100" height="20" fill="#555"/>
        <rect rx="3" x="37" width="63" height="20" fill="${color}"/>
        <path fill="${color}" d="M37 0h4v20h-4z"/>
        <rect rx="3" width="100" height="20" fill="url(#a)"/>
        <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
            <text x="19.5" y="15" fill="#010101" fill-opacity=".3">coverage</text>
            <text x="19.5" y="14">coverage</text>
            <text x="67.5" y="15" fill="#010101" fill-opacity=".3">${coveragePercentage}%</text>
            <text x="67.5" y="14">${coveragePercentage}%</text>
        </g>
    </svg>`;

    await fs.writeFile(outputPath, svg);
    console.log(`Coverage badge generated: ${outputPath}`);
}

/**
 * Parse coverage from lcov file
 */
export async function parseCoverageFromLcov(lcovFile: string): Promise<number> {
    const content = await fs.readFile(lcovFile, 'utf-8');
    const lines = content.split('\n');
    
    let linesFound = 0;
    let linesHit = 0;
    
    for (const line of lines) {
        if (line.startsWith('LF:')) {
            linesFound = parseInt(line.split(':')[1]);
        } else if (line.startsWith('LH:')) {
            linesHit = parseInt(line.split(':')[1]);
        }
    }
    
    if (linesFound === 0) return 0;
    
    return Math.round((linesHit / linesFound) * 100);
}

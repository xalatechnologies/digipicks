/**
 * Vitest setup for Storybook component testing
 *
 * This file is loaded before each test file runs.
 * It sets up global mocks and configurations for Storybook testing.
 */
import { setProjectAnnotations } from '@storybook/react-vite';
import { beforeAll } from 'vitest';
import * as projectAnnotations from './preview';

/**
 * Apply Storybook's project annotations (decorators, parameters)
 * to all component tests so they render consistently with Storybook
 */
const project = setProjectAnnotations([projectAnnotations]);

beforeAll(project.beforeAll);

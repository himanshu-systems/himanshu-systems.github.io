#!/usr/bin/env node

/**
 * Master E2E Test Runner for Blog Content Collection
 * Executes Tiers 1-4 covering all acceptance criteria and design system contracts.
 */

import { getStats, printSummary } from './harness.mjs';
import { runTier1 } from './tier1_features.mjs';
import { runTier2 } from './tier2_boundaries.mjs';
import { runTier3 } from './tier3_combinations.mjs';
import { runTier4 } from './tier4_scenarios.mjs';

async function main() {
  console.log('\n======================================================================');
  console.log('       RUNNING E2E TEST SUITE: BLOG CONTENT COLLECTION');
  console.log('======================================================================\n');

  const tierSummaries = [];

  // Helper to run a tier and record delta stats
  async function executeTier(name, runFn) {
    const startStats = { ...getStats() };
    console.log(`\x1b[34m▶ Running ${name}...\x1b[0m`);
    await runFn();
    const endStats = getStats();

    const testsRan = endStats.testCount - startStats.testCount;
    const testsPassed = endStats.passedTests - startStats.passedTests;
    const testsFailed = endStats.failedTests - startStats.failedTests;
    const assertions = endStats.totalAssertions - startStats.totalAssertions;

    tierSummaries.push({
      name,
      tests: testsRan,
      passed: testsPassed,
      failed: testsFailed,
      assertions,
    });

    if (testsFailed === 0) {
      console.log(`\x1b[32m✔ ${name} PASSED (${testsPassed} tests, ${assertions} assertions)\x1b[0m\n`);
    } else {
      console.log(`\x1b[31m✖ ${name} FAILED (${testsFailed} failed out of ${testsRan} tests)\x1b[0m\n`);
    }
  }

  await executeTier('Tier 1: Feature Coverage', runTier1);
  await executeTier('Tier 2: Boundary & Corner Cases', runTier2);
  await executeTier('Tier 3: Cross-Feature Combinations', runTier3);
  await executeTier('Tier 4: Real-World Scenarios', runTier4);

  printSummary(tierSummaries);

  const stats = getStats();
  if (stats.failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\nFatal Error in Test Runner:', err);
  process.exit(1);
});

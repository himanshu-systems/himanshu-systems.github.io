/**
 * E2E Test Harness & Assertion Engine
 * Designed for Node.js ESM execution with structured TAP output and summary reporting.
 */

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

let testCount = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

const testResults = [];
let currentSuite = '';

export function describe(suiteName, fn) {
  const previousSuite = currentSuite;
  currentSuite = suiteName;
  try {
    fn();
  } finally {
    currentSuite = previousSuite;
  }
}

export async function describeAsync(suiteName, fn) {
  const previousSuite = currentSuite;
  currentSuite = suiteName;
  try {
    await fn();
  } finally {
    currentSuite = previousSuite;
  }
}

export async function test(testName, fn) {
  testCount++;
  const fullTestName = currentSuite ? `${currentSuite} > ${testName}` : testName;
  const startTime = performance.now();
  try {
    await fn();
    const duration = performance.now() - startTime;
    passedTests++;
    testResults.push({
      name: fullTestName,
      status: 'pass',
      duration: duration.toFixed(2),
      error: null,
    });
  } catch (err) {
    const duration = performance.now() - startTime;
    failedTests++;
    testResults.push({
      name: fullTestName,
      status: 'fail',
      duration: duration.toFixed(2),
      error: err,
    });
  }
}

export const it = test;

function recordAssert(passed, message, expected, actual) {
  totalAssertions++;
  if (passed) {
    passedAssertions++;
  } else {
    failedAssertions++;
    const err = new Error(
      `Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`
    );
    throw err;
  }
}

export function assert(condition, message = 'Condition must be true') {
  recordAssert(Boolean(condition), message, true, condition);
}

export function expect(actual) {
  return {
    toBe(expected, message = '') {
      const msg = message || `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`;
      recordAssert(actual === expected, msg, expected, actual);
    },
    toEqual(expected, message = '') {
      const deepEqual = JSON.stringify(actual) === JSON.stringify(expected);
      const msg = message || `Expected deep equality`;
      recordAssert(deepEqual, msg, expected, actual);
    },
    toBeTruthy(message = '') {
      const msg = message || `Expected truthy value`;
      recordAssert(Boolean(actual), msg, 'truthy', actual);
    },
    toBeFalsy(message = '') {
      const msg = message || `Expected falsy value`;
      recordAssert(!actual, msg, 'falsy', actual);
    },
    toBeNull(message = '') {
      const msg = message || `Expected null`;
      recordAssert(actual === null, msg, null, actual);
    },
    toBeDefined(message = '') {
      const msg = message || `Expected defined value`;
      recordAssert(actual !== undefined, msg, 'defined', actual);
    },
    toBeUndefined(message = '') {
      const msg = message || `Expected undefined value`;
      recordAssert(actual === undefined, msg, undefined, actual);
    },
    toBeGreaterThan(expected, message = '') {
      const msg = message || `Expected ${actual} > ${expected}`;
      recordAssert(actual > expected, msg, `> ${expected}`, actual);
    },
    toBeGreaterThanOrEqual(expected, message = '') {
      const msg = message || `Expected ${actual} >= ${expected}`;
      recordAssert(actual >= expected, msg, `>= ${expected}`, actual);
    },
    toBeLessThan(expected, message = '') {
      const msg = message || `Expected ${actual} < ${expected}`;
      recordAssert(actual < expected, msg, `< ${expected}`, actual);
    },
    toBeLessThanOrEqual(expected, message = '') {
      const msg = message || `Expected ${actual} <= ${expected}`;
      recordAssert(actual <= expected, msg, `<= ${expected}`, actual);
    },
    toContain(expected, message = '') {
      let contains = false;
      if (typeof actual === 'string' || Array.isArray(actual)) {
        contains = actual.includes(expected);
      } else if (actual instanceof Set || actual instanceof Map) {
        contains = actual.has(expected);
      }
      const msg = message || `Expected container to contain item`;
      recordAssert(contains, msg, `contain ${JSON.stringify(expected)}`, actual);
    },
    toMatch(regex, message = '') {
      const re = typeof regex === 'string' ? new RegExp(regex) : regex;
      const matched = re.test(String(actual));
      const msg = message || `Expected string to match pattern ${re}`;
      recordAssert(matched, msg, re.toString(), actual);
    },
    toThrow(expectedMessageOrRegex, message = '') {
      let threw = false;
      let caughtError = null;
      if (typeof actual !== 'function') {
        recordAssert(false, 'Target must be a function', 'function', typeof actual);
        return;
      }
      try {
        actual();
      } catch (e) {
        threw = true;
        caughtError = e;
      }
      if (!threw) {
        recordAssert(false, message || 'Expected function to throw', 'throw', 'did not throw');
        return;
      }
      if (expectedMessageOrRegex) {
        const errorMsg = caughtError?.message || String(caughtError);
        if (typeof expectedMessageOrRegex === 'string') {
          const match = errorMsg.includes(expectedMessageOrRegex);
          recordAssert(match, message || `Expected error message containing "${expectedMessageOrRegex}"`, expectedMessageOrRegex, errorMsg);
        } else if (expectedMessageOrRegex instanceof RegExp) {
          const match = expectedMessageOrRegex.test(errorMsg);
          recordAssert(match, message || `Expected error message matching ${expectedMessageOrRegex}`, expectedMessageOrRegex.toString(), errorMsg);
        }
      } else {
        recordAssert(true, 'Function threw as expected', 'throw', 'threw');
      }
    },
    async toThrowAsync(expectedMessageOrRegex, message = '') {
      let threw = false;
      let caughtError = null;
      if (typeof actual !== 'function') {
        recordAssert(false, 'Target must be a function', 'function', typeof actual);
        return;
      }
      try {
        await actual();
      } catch (e) {
        threw = true;
        caughtError = e;
      }
      if (!threw) {
        recordAssert(false, message || 'Expected async function to throw', 'throw', 'did not throw');
        return;
      }
      if (expectedMessageOrRegex) {
        const errorMsg = caughtError?.message || String(caughtError);
        if (typeof expectedMessageOrRegex === 'string') {
          const match = errorMsg.includes(expectedMessageOrRegex);
          recordAssert(match, message || `Expected error message containing "${expectedMessageOrRegex}"`, expectedMessageOrRegex, errorMsg);
        } else if (expectedMessageOrRegex instanceof RegExp) {
          const match = expectedMessageOrRegex.test(errorMsg);
          recordAssert(match, message || `Expected error message matching ${expectedMessageOrRegex}`, expectedMessageOrRegex.toString(), errorMsg);
        }
      } else {
        recordAssert(true, 'Async function threw as expected', 'throw', 'threw');
      }
    },
  };
}

export function getStats() {
  return {
    totalAssertions,
    passedAssertions,
    failedAssertions,
    testCount,
    passedTests,
    failedTests,
    skippedTests,
    testResults,
  };
}

export function printSummary(tierSummaries = []) {
  console.log('\n' + '='.repeat(70));
  console.log('                 E2E TEST EXECUTION SUMMARY');
  console.log('='.repeat(70));

  if (tierSummaries.length > 0) {
    console.log('\n  TIER BREAKDOWN:');
    console.log('  ' + '-'.repeat(66));
    console.log(
      `  ${'Tier / Suite'.padEnd(35)} | ${'Tests'.padEnd(7)} | ${'Pass'.padEnd(6)} | ${'Fail'.padEnd(6)} | ${'Asserts'.padEnd(8)}`
    );
    console.log('  ' + '-'.repeat(66));
    for (const t of tierSummaries) {
      const statusIcon = t.failed === 0 ? '✓' : '✗';
      console.log(
        `  ${statusIcon} ${t.name.padEnd(33)} | ${String(t.tests).padEnd(7)} | ${String(t.passed).padEnd(6)} | ${String(t.failed).padEnd(6)} | ${String(t.assertions).padEnd(8)}`
      );
    }
    console.log('  ' + '-'.repeat(66));
  }

  console.log(`\n  TOTAL TESTS:      ${testCount}`);
  console.log(`  PASSED TESTS:     \x1b[32m${passedTests}\x1b[0m`);
  console.log(`  FAILED TESTS:     ${failedTests > 0 ? `\x1b[31m${failedTests}\x1b[0m` : '0'}`);
  console.log(`  TOTAL ASSERTIONS: \x1b[36m${totalAssertions}\x1b[0m (Passed: ${passedAssertions}, Failed: ${failedAssertions})`);
  console.log('='.repeat(70));

  if (failedTests > 0) {
    console.log('\n\x1b[31mFAILURES:\x1b[0m');
    for (const res of testResults) {
      if (res.status === 'fail') {
        console.log(`\n  ✖ ${res.name} (${res.duration}ms)`);
        console.log(`    ${res.error?.stack || res.error?.message || res.error}`);
      }
    }
    console.log('');
  } else {
    console.log('\n\x1b[32m✔ ALL E2E TEST TIERS COMPLETED SUCCESSFULLY!\x1b[0m\n');
  }
}

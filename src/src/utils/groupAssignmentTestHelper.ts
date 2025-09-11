// Test helper utilities to verify group assignment fixes
// This can be used in development to test edge cases

import { GroupAssignmentValidator } from './groupAssignmentValidator';

interface TestProfile {
  username: string;
  genres: string[] | null | undefined;
  personality: string[] | null | undefined;
  habits: string[] | null | undefined;
}

export class GroupAssignmentTestHelper {
  // Test cases for edge scenarios
  static getTestCases(): { name: string; profile: TestProfile; shouldPass: boolean }[] {
    return [
      {
        name: "Valid complete profile",
        profile: {
          username: "testuser123",
          genres: ["Comedy", "Drama"],
          personality: ["Funny", "Chill"],
          habits: ["Night Owl", "Coffee Addict"]
        },
        shouldPass: true
      },
      {
        name: "Valid minimal profile (only genres)",
        profile: {
          username: "minimal",
          genres: ["Comedy"],
          personality: [],
          habits: []
        },
        shouldPass: true
      },
      {
        name: "Invalid - empty username",
        profile: {
          username: "",
          genres: ["Comedy"],
          personality: ["Funny"],
          habits: ["Night Owl"]
        },
        shouldPass: false
      },
      {
        name: "Invalid - null arrays",
        profile: {
          username: "nulluser",
          genres: null,
          personality: null,
          habits: null
        },
        shouldPass: false
      },
      {
        name: "Invalid - undefined arrays",
        profile: {
          username: "undefineduser",
          genres: undefined,
          personality: undefined,
          habits: undefined
        },
        shouldPass: false
      },
      {
        name: "Edge case - very short username",
        profile: {
          username: "ab",
          genres: ["Comedy"],
          personality: [],
          habits: []
        },
        shouldPass: false
      },
      {
        name: "Edge case - very long username",
        profile: {
          username: "a".repeat(50),
          genres: ["Comedy"],
          personality: [],
          habits: []
        },
        shouldPass: false
      },
      {
        name: "Edge case - whitespace only username",
        profile: {
          username: "   ",
          genres: ["Comedy"],
          personality: [],
          habits: []
        },
        shouldPass: false
      }
    ];
  }

  // Run validation tests
  static runValidationTests(): { passed: number; failed: number; results: any[] } {
    const testCases = this.getTestCases();
    const results: any[] = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      try {
        const validation = GroupAssignmentValidator.validateUserProfile(testCase.profile as any);
        const actualResult = validation.isValid;
        const expectedResult = testCase.shouldPass;

        if (actualResult === expectedResult) {
          passed++;
          results.push({
            name: testCase.name,
            status: 'PASS',
            expected: expectedResult,
            actual: actualResult,
            errors: validation.errors,
            warnings: validation.warnings
          });
        } else {
          failed++;
          results.push({
            name: testCase.name,
            status: 'FAIL',
            expected: expectedResult,
            actual: actualResult,
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
      } catch (error) {
        failed++;
        results.push({
          name: testCase.name,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { passed, failed, results };
  }

  // Test array safety functions
  static testArraySafety(): boolean {
    const testCases = [
      { input: null, expected: [] },
      { input: undefined, expected: [] },
      { input: [], expected: [] },
      { input: ["valid"], expected: ["valid"] },
      { input: ["", "valid", "  "], expected: ["valid"] },
      { input: [123, "valid", null], expected: ["valid"] }
    ];

    for (const testCase of testCases) {
      const result = GroupAssignmentValidator.validateArrayData(testCase.input, 'test');
      if (JSON.stringify(result) !== JSON.stringify(testCase.expected)) {
        console.error(`Array safety test failed for input:`, testCase.input);
        return false;
      }
    }

    return true;
  }

  // Test profile completeness calculation
  static testProfileCompleteness(): boolean {
    const testCases = [
      {
        profile: { username: "test", genres: ["Comedy"], personality: ["Funny"], habits: ["Night Owl"] },
        expectedMin: 70, // Should be high completeness
        expectedMax: 100
      },
      {
        profile: { username: "test", genres: [], personality: [], habits: [] },
        expectedMin: 30, // Only username
        expectedMax: 30
      },
      {
        profile: { username: "", genres: [], personality: [], habits: [] },
        expectedMin: 0, // Nothing valid
        expectedMax: 0
      }
    ];

    for (const testCase of testCases) {
      const score = GroupAssignmentValidator.calculateProfileCompleteness(testCase.profile as any);
      if (score < testCase.expectedMin || score > testCase.expectedMax) {
        console.error(`Completeness test failed for profile:`, testCase.profile, `Score: ${score}`);
        return false;
      }
    }

    return true;
  }

  // Generate test report
  static generateTestReport(): string {
    const validationResults = this.runValidationTests();
    const arraySafetyPassed = this.testArraySafety();
    const completenessPassed = this.testProfileCompleteness();

    let report = "# Group Assignment Fixes Test Report\n\n";
    
    report += `## Validation Tests\n`;
    report += `- **Passed**: ${validationResults.passed}\n`;
    report += `- **Failed**: ${validationResults.failed}\n`;
    report += `- **Total**: ${validationResults.passed + validationResults.failed}\n\n`;

    report += `## Array Safety Tests\n`;
    report += `- **Status**: ${arraySafetyPassed ? 'PASS' : 'FAIL'}\n\n`;

    report += `## Profile Completeness Tests\n`;
    report += `- **Status**: ${completenessPassed ? 'PASS' : 'FAIL'}\n\n`;

    report += `## Detailed Results\n`;
    for (const result of validationResults.results) {
      report += `### ${result.name}\n`;
      report += `- **Status**: ${result.status}\n`;
      if (result.expected !== undefined) {
        report += `- **Expected**: ${result.expected}\n`;
        report += `- **Actual**: ${result.actual}\n`;
      }
      if (result.errors && result.errors.length > 0) {
        report += `- **Errors**: ${result.errors.join(', ')}\n`;
      }
      if (result.warnings && result.warnings.length > 0) {
        report += `- **Warnings**: ${result.warnings.join(', ')}\n`;
      }
      if (result.error) {
        report += `- **Error**: ${result.error}\n`;
      }
      report += `\n`;
    }

    const overallStatus = validationResults.failed === 0 && arraySafetyPassed && completenessPassed;
    report += `## Overall Status: ${overallStatus ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`;

    return report;
  }
}

// Export for use in development console
if (typeof window !== 'undefined') {
  (window as any).GroupAssignmentTestHelper = GroupAssignmentTestHelper;
}
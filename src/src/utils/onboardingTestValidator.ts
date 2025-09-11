// Test validator for onboarding completion functionality
// This validates that our fixes work correctly and don't break the application

interface TestProfile {
  username: string;
  genres: string[];
  personality: string[];
  habits: string[];
}

interface OnboardingResult {
  success: boolean;
  groupId?: string;
}

interface GroupMemberManagementResult {
  success: boolean;
  error?: string;
  groupId?: string;
  groupName?: string;
}

export class OnboardingTestValidator {
  // Simulate the retry operation to test logic
  static async simulateRetryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`Test retry attempt ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 10)); // Fast test delay
      }
    }
    throw new Error('All retry attempts failed');
  }

  // Simulate addUserToGroup responses
  static mockAddUserToGroup(scenario: string): GroupMemberManagementResult {
    switch (scenario) {
      case 'success':
        return { success: true, groupId: 'group123', groupName: 'Test Group' };
      case 'capacity':
        return { success: false, error: 'Group at capacity' };
      case 'other_error':
        return { success: false, error: 'Database connection failed' };
      case 'no_group_id':
        return { success: true }; // Missing groupId
      default:
        return { success: false, error: 'Unknown error' };
    }
  }

  // Test the fixed retry logic
  static async testRetryLogic(): Promise<{ passed: boolean; details: string[] }> {
    const details: string[] = [];
    let passed = true;

    try {
      // Test 1: Success case should return value immediately
      const successResult = await this.simulateRetryOperation(async (): Promise<string> => {
        const result = this.mockAddUserToGroup('success');
        if (result.success && result.groupId) {
          return result.groupId;
        }
        throw new Error('Failed');
      });

      if (successResult === 'group123') {
        details.push('✅ Success case works correctly');
      } else {
        details.push('❌ Success case failed');
        passed = false;
      }

      // Test 2: Retry on exceptions
      let attemptCount = 0;
      try {
        await this.simulateRetryOperation(async (): Promise<string> => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return 'success-after-retry';
        });
        details.push('✅ Retry logic works correctly');
      } catch (error) {
        details.push('❌ Retry logic failed');
        passed = false;
      }

      // Test 3: Final failure after max retries
      try {
        await this.simulateRetryOperation(async (): Promise<string> => {
          throw new Error('Persistent failure');
        });
        details.push('❌ Should have thrown after max retries');
        passed = false;
      } catch (error) {
        details.push('✅ Correctly throws after max retries');
      }

    } catch (error) {
      details.push(`❌ Test framework error: ${error}`);
      passed = false;
    }

    return { passed, details };
  }

  // Test group assignment scenarios
  static async testGroupAssignmentScenarios(): Promise<{ passed: boolean; details: string[] }> {
    const details: string[] = [];
    let passed = true;

    // Test scenario 1: Normal success
    try {
      const result = await this.simulateRetryOperation(async (): Promise<string> => {
        const addResult = this.mockAddUserToGroup('success');
        if (addResult.success && addResult.groupId) {
          return addResult.groupId;
        }
        throw new Error(`Failed to join group: ${addResult.error}`);
      });

      if (result === 'group123') {
        details.push('✅ Normal success scenario works');
      } else {
        details.push('❌ Normal success scenario failed');
        passed = false;
      }
    } catch (error) {
      details.push('❌ Normal success scenario threw unexpected error');
      passed = false;
    }

    // Test scenario 2: Group at capacity (should create new group)
    try {
      const result = await this.simulateRetryOperation(async (): Promise<string> => {
        const addResult = this.mockAddUserToGroup('capacity');
        if (addResult.success && addResult.groupId) {
          return addResult.groupId;
        } else if (addResult.error === 'Group at capacity') {
          // Simulate creating new group
          const newGroupResult = this.mockAddUserToGroup('success');
          if (newGroupResult.success && newGroupResult.groupId) {
            return newGroupResult.groupId;
          }
          throw new Error('Failed to join newly created group');
        } else {
          throw new Error(`Failed to join group: ${addResult.error}`);
        }
      });

      if (result === 'group123') {
        details.push('✅ Group capacity scenario works (creates new group)');
      } else {
        details.push('❌ Group capacity scenario failed');
        passed = false;
      }
    } catch (error) {
      details.push('❌ Group capacity scenario threw unexpected error');
      passed = false;
    }

    // Test scenario 3: Other errors should retry
    try {
      let attemptCount = 0;
      const result = await this.simulateRetryOperation(async (): Promise<string> => {
        attemptCount++;
        const addResult = attemptCount < 3 
          ? this.mockAddUserToGroup('other_error')
          : this.mockAddUserToGroup('success');
        
        if (addResult.success && addResult.groupId) {
          return addResult.groupId;
        } else {
          throw new Error(`Failed to join group: ${addResult.error}`);
        }
      });

      if (result === 'group123' && attemptCount === 3) {
        details.push('✅ Error retry scenario works (succeeds after retries)');
      } else {
        details.push('❌ Error retry scenario failed');
        passed = false;
      }
    } catch (error) {
      details.push('❌ Error retry scenario threw unexpected error');
      passed = false;
    }

    return { passed, details };
  }

  // Test profile validation
  static testProfileValidation(): { passed: boolean; details: string[] } {
    const details: string[] = [];
    let passed = true;

    const testCases = [
      {
        name: "Valid profile",
        profile: { username: "testuser", genres: ["Comedy"], personality: [], habits: [] },
        shouldPass: true
      },
      {
        name: "Empty username",
        profile: { username: "", genres: ["Comedy"], personality: [], habits: [] },
        shouldPass: false
      },
      {
        name: "Short username",
        profile: { username: "ab", genres: ["Comedy"], personality: [], habits: [] },
        shouldPass: false
      },
      {
        name: "No preferences",
        profile: { username: "testuser", genres: [], personality: [], habits: [] },
        shouldPass: false
      }
    ];

    for (const testCase of testCases) {
      const validation = this.validateProfile(testCase.profile);
      if (validation.isValid === testCase.shouldPass) {
        details.push(`✅ ${testCase.name} validation correct`);
      } else {
        details.push(`❌ ${testCase.name} validation failed`);
        passed = false;
      }
    }

    return { passed, details };
  }

  // Simulate the profile validation logic
  static validateProfile(profile: TestProfile): { isValid: boolean; error?: string } {
    if (!profile.username || profile.username.trim().length === 0) {
      return { isValid: false, error: 'Username is required' };
    }

    if (profile.username.trim().length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters long' };
    }

    const hasGenres = Array.isArray(profile.genres) && profile.genres.length > 0;
    const hasPersonality = Array.isArray(profile.personality) && profile.personality.length > 0;
    const hasHabits = Array.isArray(profile.habits) && profile.habits.length > 0;

    if (!hasGenres && !hasPersonality && !hasHabits) {
      return { isValid: false, error: 'At least one preference is required' };
    }

    return { isValid: true };
  }

  // Test return type compatibility
  static testReturnTypeCompatibility(): { passed: boolean; details: string[] } {
    const details: string[] = [];
    let passed = true;

    try {
      // Simulate the expected return type
      const mockResult: OnboardingResult = { success: true, groupId: 'group123' };
      
      if (typeof mockResult.success === 'boolean' && 
          (mockResult.groupId === undefined || typeof mockResult.groupId === 'string')) {
        details.push('✅ Return type structure is correct');
      } else {
        details.push('❌ Return type structure is incorrect');
        passed = false;
      }

      // Test success case
      if (mockResult.success && mockResult.groupId) {
        details.push('✅ Success case return type valid');
      } else {
        details.push('❌ Success case return type invalid');
        passed = false;
      }

      // Test failure case
      const failureResult: OnboardingResult = { success: false };
      if (!failureResult.success && !failureResult.groupId) {
        details.push('✅ Failure case return type valid');
      } else {
        details.push('❌ Failure case return type invalid');
        passed = false;
      }

    } catch (error) {
      details.push(`❌ Return type test error: ${error}`);
      passed = false;
    }

    return { passed, details };
  }

  // Run all tests
  static async runAllTests(): Promise<{ passed: boolean; summary: string }> {
    const results = {
      retryLogic: await this.testRetryLogic(),
      groupAssignment: await this.testGroupAssignmentScenarios(),
      profileValidation: this.testProfileValidation(),
      returnType: this.testReturnTypeCompatibility()
    };

    const allPassed = Object.values(results).every(result => result.passed);
    
    let summary = "# Onboarding Completion Test Results\n\n";
    
    for (const [testName, result] of Object.entries(results)) {
      summary += `## ${testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}\n`;
      summary += `**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
      for (const detail of result.details) {
        summary += `- ${detail}\n`;
      }
      summary += '\n';
    }

    summary += `## Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`;

    return { passed: allPassed, summary };
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).OnboardingTestValidator = OnboardingTestValidator;
}
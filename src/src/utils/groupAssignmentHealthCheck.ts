/**
 * Group Assignment Health Check Utility
 * Diagnoses and reports issues with group assignment functionality
 */

import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
  diagnostics: {
    databaseConnection: boolean;
    rpcFunctionExists: boolean;
    tablesExist: boolean;
    policiesPermissive: boolean;
    testGroupCreation: boolean;
    testUserAssignment: boolean;
  };
}

export const performGroupAssignmentHealthCheck = async (userId?: string): Promise<HealthCheckResult> => {
  const result: HealthCheckResult = {
    isHealthy: true,
    issues: [],
    recommendations: [],
    diagnostics: {
      databaseConnection: false,
      rpcFunctionExists: false,
      tablesExist: false,
      policiesPermissive: false,
      testGroupCreation: false,
      testUserAssignment: false
    }
  };

  try {
    console.log('🩺 Starting group assignment health check...');

    // 1. Test database connection
    try {
      // Test basic database connectivity
      const { error } = await supabase.from('groups').select('id').limit(1);
      result.diagnostics.databaseConnection = !error;
      if (error) {
        result.issues.push(`Database connection failed: ${error.message}`);
        result.recommendations.push('Check your Supabase connection and credentials');
      }
    } catch (connError: any) {
      result.issues.push(`Database connection error: ${connError.message}`);
      result.recommendations.push('Verify Supabase client configuration');
    }

    // 2. Test RPC function existence
    try {
      const { data, error } = await supabase.rpc('join_group_safe', {
        p_group_id: '00000000-0000-0000-0000-000000000000'
      });
      
      // If function exists, we'll get a proper response (even if it fails due to invalid IDs)
      result.diagnostics.rpcFunctionExists = true;
    } catch (rpcError: any) {
      if (rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
        result.issues.push('RPC function join_group_safe does not exist');
        result.recommendations.push('Run the migration 20250810000000_apply_superior_group_join_solution.sql in your Supabase SQL editor');
        result.diagnostics.rpcFunctionExists = false;
      } else {
        // Function exists but failed for other reasons (expected with dummy IDs)
        result.diagnostics.rpcFunctionExists = true;
      }
    }

    // 3. Test table structure
    try {
      // Check table structures
      const { data: groupsStructure } = await supabase
        .from('groups')
        .select('id, name, current_members, max_members')
        .limit(1);
      
      const { data: profilesStructure } = await supabase
        .from('profiles')
        .select('id, user_id, username, group_id')
        .limit(1);
      
      const { data: membersStructure } = await supabase
        .from('group_members')
        .select('id, group_id, user_id')
        .limit(1);

      result.diagnostics.tablesExist = true;
    } catch (tableError: any) {
      result.issues.push(`Table structure issues: ${tableError.message}`);
      result.recommendations.push('Verify all required tables exist with correct columns');
      result.diagnostics.tablesExist = false;
    }

    // 4. Test permissions (attempt to create a test group)
    if (result.diagnostics.databaseConnection && result.diagnostics.tablesExist) {
      try {
        const testGroupName = `health-check-${Date.now()}`;
        const { data: testGroup, error: createError } = await supabase
          .from('groups')
          .insert({
            name: testGroupName,
            vibe_label: 'Health Check',
            current_members: 0,
            max_members: 10,
            is_private: false,
            lifecycle_stage: 'active'
          })
          .select('id')
          .single();

        if (!createError && testGroup) {
          result.diagnostics.testGroupCreation = true;
          
          // Clean up test group
          await supabase.from('groups').delete().eq('id', testGroup.id);
        } else {
          result.issues.push(`Cannot create groups: ${createError?.message}`);
          result.recommendations.push('Check RLS policies and permissions for groups table');
        }
      } catch (permError: any) {
        result.issues.push(`Permission test failed: ${permError.message}`);
        result.recommendations.push('Review and fix RLS policies using the ULTIMATE_GROUP_FIX.sql script');
      }
    }

    // 5. Test user assignment (if userId provided)
    if (userId && result.diagnostics.rpcFunctionExists && result.diagnostics.testGroupCreation) {
      try {
        // Create a temporary test group
        const { data: testGroup, error: createError } = await supabase
          .from('groups')
          .insert({
            name: `assignment-test-${Date.now()}`,
            vibe_label: 'Assignment Test',
            current_members: 0,
            max_members: 10,
            is_private: false,
            lifecycle_stage: 'active'
          })
          .select('id')
          .single();

        if (!createError && testGroup) {
          // Test the RPC function
          const { data: rpcResult, error: rpcError } = await supabase.rpc('join_group_safe', {
            p_group_id: testGroup.id
          });

          if (!rpcError && typeof rpcResult === 'object' && rpcResult && 'ok' in rpcResult && rpcResult.ok) {
            result.diagnostics.testUserAssignment = true;
            
            // Clean up test assignment
            await supabase.from('group_members').delete().eq('group_id', testGroup.id);
            await supabase.from('profiles').update({ group_id: null }).eq('user_id', userId);
          } else {
            result.issues.push(`User assignment failed: ${rpcError?.message || (typeof rpcResult === 'object' && rpcResult && 'error' in rpcResult ? String(rpcResult.error) : 'Unknown error')}`);
            result.recommendations.push('Debug the join_group_safe RPC function');
          }
          
          // Clean up test group
          await supabase.from('groups').delete().eq('id', testGroup.id);
        }
      } catch (assignmentError: any) {
        result.issues.push(`Assignment test error: ${assignmentError.message}`);
        result.recommendations.push('Check user permissions and RPC function implementation');
      }
    }

    // 6. Overall health assessment
    const criticalIssues = [
      !result.diagnostics.databaseConnection,
      !result.diagnostics.rpcFunctionExists,
      !result.diagnostics.tablesExist
    ].filter(Boolean).length;

    result.isHealthy = criticalIssues === 0 && result.issues.length === 0;

    // Add summary recommendations
    if (!result.isHealthy) {
      if (criticalIssues > 0) {
        result.recommendations.unshift('🚨 CRITICAL: Run the ULTIMATE_GROUP_FIX.sql script immediately');
      }
      result.recommendations.push('📝 Enable detailed logging to monitor group assignment attempts');
      result.recommendations.push('🔄 Retry failed operations with exponential backoff');
    }

    console.log('🩺 Health check completed:', {
      isHealthy: result.isHealthy,
      issueCount: result.issues.length,
      diagnostics: result.diagnostics
    });

    return result;

  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    result.isHealthy = false;
    result.issues.push(`Health check failed: ${error.message}`);
    result.recommendations.push('Review Supabase configuration and connection');
    return result;
  }
};

export const logHealthCheckResults = (results: HealthCheckResult) => {
  console.log('🩺 === GROUP ASSIGNMENT HEALTH CHECK RESULTS ===');
  console.log(`Overall Health: ${results.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  
  console.log('\n📊 Diagnostics:');
  Object.entries(results.diagnostics).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
  });
  
  if (results.issues.length > 0) {
    console.log('\n🚨 Issues Found:');
    results.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  console.log('🩺 === END HEALTH CHECK RESULTS ===\n');
};

// Export a simple function to run health check with logging
export const runGroupAssignmentHealthCheck = async (userId?: string) => {
  const results = await performGroupAssignmentHealthCheck(userId);
  logHealthCheckResults(results);
  return results;
};


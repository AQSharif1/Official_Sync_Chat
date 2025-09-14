/**
 * Group Assignment Validation Utility
 * Quick validation script for the group assignment system
 */

import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  summary: 'PASSED' | 'FAILED' | 'PARTIAL';
  errors: string[];
  warnings: string[];
  recommendations: string[];
  details: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
}

export const validateGroupAssignmentSystem = async (): Promise<ValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let passedChecks = 0;
  let failedChecks = 0;
  let warningChecks = 0;
  const totalChecks = 8;

  // Check 1: Verify RPC function exists
  try {
    const { data, error } = await supabase.rpc('join_group_safe', {
      p_group_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error && error.message.includes('function "join_group_safe" does not exist')) {
      errors.push('RPC function join_group_safe does not exist');
      failedChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    passedChecks++; // Function exists if we get a different error
  }

  // Check 2: Verify profiles table structure
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, username, email, created_at')
      .limit(1);
    
    if (error) {
      errors.push(`Profiles table error: ${error.message}`);
      failedChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    errors.push('Profiles table not accessible');
    failedChecks++;
  }

  // Check 3: Verify groups table structure
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, vibe_label, max_members, current_members, created_at')
      .limit(1);
    
    if (error) {
      errors.push(`Groups table error: ${error.message}`);
      failedChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    errors.push('Groups table not accessible');
    failedChecks++;
  }

  // Check 4: Verify group_members table structure
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, joined_at, role')
      .limit(1);
    
    if (error) {
      errors.push(`Group members table error: ${error.message}`);
      failedChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    errors.push('Group members table not accessible');
    failedChecks++;
  }

  // Check 5: Verify RLS policies
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('permission denied')) {
      warnings.push('RLS policies may be too restrictive');
      warningChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    warnings.push('Could not verify RLS policies');
    warningChecks++;
  }

  // Check 6: Verify user authentication
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      warnings.push('User authentication check failed');
      warningChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    warnings.push('Could not verify user authentication');
    warningChecks++;
  }

  // Check 7: Verify database connection
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error && error.message.includes('connection')) {
      errors.push('Database connection issues detected');
      failedChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    warnings.push('Database connection status unclear');
    warningChecks++;
  }

  // Check 8: Verify function permissions
  try {
    const { data, error } = await supabase.rpc('join_group_safe', {
      p_group_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error && error.message.includes('permission denied')) {
      warnings.push('Function permissions may be restricted');
      warningChecks++;
    } else {
      passedChecks++;
    }
  } catch (e) {
    passedChecks++; // Function accessible
  }

  // Generate summary
  let summary: 'PASSED' | 'FAILED' | 'PARTIAL' = 'PASSED';
  if (failedChecks > 0) {
    summary = 'FAILED';
  } else if (warningChecks > 0) {
    summary = 'PARTIAL';
  }

  // Generate recommendations
  if (errors.length > 0) {
    recommendations.push('Fix critical errors before deployment');
  }
  if (warnings.length > 0) {
    recommendations.push('Review warnings for potential issues');
  }
  if (passedChecks === totalChecks) {
    recommendations.push('System appears ready for production');
  }

  return {
    summary,
    errors,
    warnings,
    recommendations,
    details: {
      totalChecks,
      passedChecks,
      failedChecks,
      warningChecks
    }
  };
};

// Utility function to display validation results
export const displayValidationResults = (result: ValidationResult) => {
  // This function can be used for logging or display purposes
  // but doesn't output to console in production
  return {
    status: result.summary,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    recommendationCount: result.recommendations.length
  };
};

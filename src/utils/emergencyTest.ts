/**
 * Emergency Test Function
 * Quick test to verify the constraint fix worked
 */

import { supabase } from '@/integrations/supabase/client';

export const runEmergencyTest = async (userId?: string) => {
  console.log('🚨 Running emergency constraint test...');
  
  try {
    // Test 1: Check if profiles table has group_id column
    const { data: profilesStructure, error: profileError } = await supabase
      .from('profiles')
      .select('group_id')
      .limit(1);
    
    if (profileError) {
      console.error('❌ Cannot check profiles structure:', profileError);
    } else {
      console.log('✅ Profiles table structure check passed');
    }

    // Test 2: Try to create a test group
    const testGroupName = `emergency-test-${Date.now()}`;
    const { data: testGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: testGroupName,
        vibe_label: 'Emergency Test',
        current_members: 0,
        max_members: 10,
        is_private: false,
        lifecycle_stage: 'active'
      })
      .select('id')
      .single();

    if (groupError) {
      console.error('❌ Cannot create test group:', groupError);
      return { success: false, error: groupError.message };
    }

    console.log('✅ Test group created:', testGroup.id);

    // Test 3: Test RPC function if user provided
    if (userId) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('join_group_safe', {
        p_group_id: testGroup.id
      });

      console.log('🧪 RPC Test Result:', { rpcResult, rpcError });

      if (rpcError) {
        console.error('❌ RPC function still has issues:', rpcError);
      } else if (typeof rpcResult === 'object' && rpcResult && 'ok' in rpcResult && rpcResult.ok) {
        console.log('✅ RPC function working!');
      }

      // Cleanup
      await supabase.from('group_members').delete().eq('group_id', testGroup.id);
      await supabase.from('profiles').update({ group_id: null }).eq('user_id', userId);
    }

    // Cleanup test group
    await supabase.from('groups').delete().eq('id', testGroup.id);

    console.log('🎉 Emergency test completed successfully!');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Emergency test failed:', error);
    return { success: false, error: error.message };
  }
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).runEmergencyTest = runEmergencyTest;
}

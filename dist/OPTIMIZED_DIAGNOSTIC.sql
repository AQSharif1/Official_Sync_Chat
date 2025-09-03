-- Optimized Diagnostic Query for Group Membership Issues

-- Create indexes if not exists (add to a separate migration)
CREATE INDEX IF NOT EXISTS idx_group_members_user_group ON public.group_members (user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_group ON public.profiles (user_id, group_id);

-- Comprehensive Diagnostic CTE
WITH 
rpc_function_check AS (
  SELECT 
    r.routine_name,
    r.routine_type,
    r.data_type,
    array_agg(p.parameter_name) AS parameters
  FROM information_schema.routines r
  LEFT JOIN information_schema.parameters p ON r.routine_name = p.specific_name
  WHERE r.routine_name = 'add_user_to_group'
  GROUP BY r.routine_name, r.routine_type, r.data_type
),
group_membership_analysis AS (
  SELECT 
    g.id AS group_id,
    g.name AS group_name,
    g.current_members,
    g.max_members,
    COUNT(gm.id) AS active_member_count,
    json_agg(
      json_build_object(
        'user_id', p.user_id, 
        'username', p.username, 
        'joined_at', gm.joined_at
      )
    ) AS active_members
  FROM public.groups g
  LEFT JOIN public.group_members gm ON g.id = gm.group_id
  LEFT JOIN public.profiles p ON gm.user_id = p.user_id
  GROUP BY g.id, g.name, g.current_members, g.max_members
  ORDER BY active_member_count DESC
  LIMIT 10
),
recent_profile_activity AS (
  SELECT 
    p.user_id,
    p.username,
    p.group_id,
    p.created_at,
    u.email,
    u.email_confirmed_at,
    COALESCE(gm.role, 'Not in Group') AS group_role
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.group_members gm ON p.user_id = gm.user_id
  ORDER BY p.created_at DESC
  LIMIT 10
)
SELECT 
  'Diagnostic Report' AS report_type,
  json_build_object(
    'rpc_function', (SELECT row_to_json(rpc_function_check) FROM rpc_function_check),
    'group_memberships', (SELECT json_agg(row_to_json(group_membership_analysis)) FROM group_membership_analysis),
    'recent_profiles', (SELECT json_agg(row_to_json(recent_profile_activity)) FROM recent_profile_activity)
  ) AS diagnostic_data;

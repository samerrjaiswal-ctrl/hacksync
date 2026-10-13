import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// Using native globalThis.crypto for randomUUID

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, code, memberNo } = await req.json()

    if (!name || !code || !memberNo) {
      return new Response(JSON.stringify({ error: 'Name, invite code, and member number are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Initialize Supabase admin client (requires SUPABASE_SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Verify the team code and get team details
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('join_code', code.toLowerCase())
      .single()

    if (teamError || !team) {
      return new Response(JSON.stringify({ error: 'Invalid invite code or team not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 2. Enforce the 6-member limit and slot uniqueness
    const { data: members, error: membersError } = await supabaseAdmin
      .from('team_members')
      .select('user_id, profiles!inner(display_name)')
      .eq('team_id', team.id)
      
    if (membersError) throw membersError;
    
    if (members.length >= 6) {
      return new Response(JSON.stringify({ error: 'Team has reached the maximum of 6 members' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 2.5 Check slot uniqueness
    const isSlotTaken = members.some((m: any) => {
      const profileName = Array.isArray(m.profiles) ? m.profiles[0]?.display_name : m.profiles?.display_name || '';
      return profileName.includes(`(Member ${memberNo})`);
    });

    if (isSlotTaken) {
      return new Response(JSON.stringify({ error: `Team member ${memberNo} is already present.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }
    // 3. Generate random guest credentials
    const guestId = crypto.randomUUID()
    const dummyEmail = `guest_${guestId}@guest.hacksync.app`
    const password = crypto.randomUUID()

    // 4. Create the Auth user via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: name
      },
      app_metadata: {
        is_guest: true
      }
    })

    if (authError) throw authError;

    const user = authData.user;

    // 5. Wrap subsequent steps in a try/catch to guarantee cleanup of the Auth user on partial failure.
    try {
      // Insert into profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          display_name: name
        })
      if (profileError) throw profileError;

      // Insert into team_members (The DB trigger performs the final atomic limit check here)
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'member'
        })

      if (memberError) {
        if (memberError.message?.includes('maximum of 6 members')) {
          throw new Error('LIMIT_EXCEEDED');
        }
        throw memberError;
      }

      // Generate the session server-side using the regular anon client
      // so we don't expose the dummy password to the frontend.
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: dummyEmail,
        password: password
      })

      if (signInError || !signInData.session) {
        throw signInError || new Error('Failed to generate session');
      }

      // Return the session to the client
      return new Response(JSON.stringify({ 
        session: signInData.session,
        teamId: team.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } catch (innerError: any) {
      // CLEANUP: If anything failed after Auth user creation, delete the user.
      // (ON DELETE CASCADE in the database schema will automatically drop any orphaned profiles or team_members).
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (innerError.message === 'LIMIT_EXCEEDED') {
        return new Response(JSON.stringify({ error: 'Team has reached the maximum of 6 members' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
      throw innerError; // Rethrow to be caught by the outer block and return a 500
    }

  } catch (error: any) {
    console.error('Guest join error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred during guest joining' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
    const googleRedirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') ?? ''

    // Initialize admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Extract Bearer token from caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Verify authenticated user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const body = await req.json().catch(() => ({}))
    const { action, teamId } = body

    if (!teamId) {
      return new Response(JSON.stringify({ error: 'teamId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 1. Verify caller's membership and role in this team
    const { data: membership, error: memberErr } = await supabaseAdmin
      .from('team_members')
      .select('role, team_id, teams(name, owner_id)')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (memberErr || !membership) {
      return new Response(JSON.stringify({ error: 'You are not a member of this team' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    const isLeader = (membership.role === 'owner') || ((membership.teams as any)?.owner_id === user.id)
    const teamName = (membership.teams as any)?.name || 'Team'

    // ==========================================
    // ACTION: GET-STATUS
    // ==========================================
    if (action === 'get-status') {
      const isConfigured = Boolean(googleClientId && googleClientSecret && googleRedirectUri)
      
      const { data: tokenRow } = await supabaseAdmin
        .from('team_google_drive_tokens')
        .select('google_email, updated_at')
        .eq('team_id', teamId)
        .maybeSingle()

      return new Response(JSON.stringify({
        isConnected: Boolean(tokenRow?.google_email),
        googleEmail: tokenRow?.google_email || null,
        isConfigured,
        isLeader,
        lastUpdated: tokenRow?.updated_at || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ==========================================
    // ACTION: GET-AUTH-URL (Leader only)
    // ==========================================
    if (action === 'get-auth-url') {
      if (!isLeader) {
        return new Response(JSON.stringify({ error: 'Only the team leader can connect Google Drive' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
        return new Response(JSON.stringify({
          error: 'GOOGLE_OAUTH_NOT_CONFIGURED',
          message: 'Google OAuth is not configured on this server. Please configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in Supabase secrets.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Generate state token
      const statePayload = {
        teamId,
        leaderId: user.id,
        nonce: crypto.randomUUID()
      }
      const state = btoa(JSON.stringify(statePayload))

      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ')

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: googleRedirectUri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        prompt: 'consent',
        state
      }).toString()

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ==========================================
    // ACTION: OAUTH-CALLBACK (Leader only)
    // ==========================================
    if (action === 'oauth-callback') {
      if (!isLeader) {
        return new Response(JSON.stringify({ error: 'Only the team leader can complete Google Drive connection' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      const { code, state } = body
      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'Missing code or state' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Validate state
      try {
        const decodedState = JSON.parse(atob(state))
        if (decodedState.teamId !== teamId || decodedState.leaderId !== user.id) {
          throw new Error('State validation failed')
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid or expired OAuth state parameter' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Exchange authorization code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: googleRedirectUri,
          grant_type: 'authorization_code'
        })
      })

      const tokenData = await tokenRes.json()
      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response(JSON.stringify({ 
          error: 'Failed to exchange authorization code with Google',
          details: tokenData.error_description || tokenData.error 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Fetch user profile email
      let googleEmail = null
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          googleEmail = userData.email || null
        }
      } catch (err) {
        console.error('Failed to fetch user email:', err)
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()

      // Upsert token in team_google_drive_tokens
      const { error: upsertErr } = await supabaseAdmin
        .from('team_google_drive_tokens')
        .upsert({
          team_id: teamId,
          leader_id: user.id,
          google_email: googleEmail,
          refresh_token: tokenData.refresh_token,
          access_token: tokenData.access_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })

      if (upsertErr) {
        throw upsertErr
      }

      return new Response(JSON.stringify({
        success: true,
        googleEmail
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ==========================================
    // ACTION: DISCONNECT (Leader only)
    // ==========================================
    if (action === 'disconnect') {
      if (!isLeader) {
        return new Response(JSON.stringify({ error: 'Only the team leader can disconnect Google Drive' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      // Optional: revoke token
      const { data: tokenRow } = await supabaseAdmin
        .from('team_google_drive_tokens')
        .select('access_token, refresh_token')
        .eq('team_id', teamId)
        .maybeSingle()

      if (tokenRow?.access_token || tokenRow?.refresh_token) {
        try {
          const tok = tokenRow.refresh_token || tokenRow.access_token
          await fetch(`https://oauth2.googleapis.com/revoke?token=${tok}`, { method: 'POST' })
        } catch (_) {
          // ignore revoke failures
        }
      }

      await supabaseAdmin
        .from('team_google_drive_tokens')
        .delete()
        .eq('team_id', teamId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Helper function to get valid access token
    async function getValidGoogleAccessToken(forceRefresh = false): Promise<string> {
      const { data: tokenRow, error: tErr } = await supabaseAdmin
        .from('team_google_drive_tokens')
        .select('*')
        .eq('team_id', teamId)
        .single()

      if (tErr || !tokenRow) {
        throw new Error('Google Drive is not connected for this team. Please ask the team leader to connect Google Drive.')
      }

      const now = new Date()
      const expiry = tokenRow.expires_at ? new Date(tokenRow.expires_at) : new Date(0)

      // If token is still valid (with 5 min safety buffer), return it unless forceRefresh is requested
      if (!forceRefresh && tokenRow.access_token && (expiry.getTime() - now.getTime()) > 300000) {
        return tokenRow.access_token
      }

      // Refresh token
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token'
        })
      })

      const refData = await refreshRes.json()
      if (!refreshRes.ok || !refData.access_token) {
        throw new Error('Failed to refresh Google Drive access token. Team leader may need to reconnect Google Drive.')
      }

      const newExpiresAt = new Date(Date.now() + (refData.expires_in || 3600) * 1000).toISOString()
      await supabaseAdmin
        .from('team_google_drive_tokens')
        .update({
          access_token: refData.access_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('team_id', teamId)

      return refData.access_token
    }

    // Helper function to get or create team folder in Google Drive
    async function getOrCreateTeamFolder(accessToken: string): Promise<string> {
      const { data: tokenRow } = await supabaseAdmin
        .from('team_google_drive_tokens')
        .select('folder_id, root_folder_id')
        .eq('team_id', teamId)
        .single()

      if (tokenRow?.folder_id) {
        return tokenRow.folder_id
      }

      // 1. Find or create root folder "HackSync Demo Videos"
      let rootFolderId = tokenRow?.root_folder_id
      if (!rootFolderId) {
        const query = encodeURIComponent("name = 'HackSync Demo Videos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false")
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const searchData = await searchRes.json()

        if (searchData.files && searchData.files.length > 0) {
          rootFolderId = searchData.files[0].id
        } else {
          const createRoot = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: 'HackSync Demo Videos',
              mimeType: 'application/vnd.google-apps.folder'
            })
          })
          const rootData = await createRoot.json()
          rootFolderId = rootData.id
        }

        await supabaseAdmin
          .from('team_google_drive_tokens')
          .update({ root_folder_id: rootFolderId })
          .eq('team_id', teamId)
      }

      // 2. Find or create team subfolder
      const cleanTeamName = teamName.replace(/['"\\]/g, '')
      const subQuery = encodeURIComponent(`name = '${cleanTeamName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)
      const subSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${subQuery}&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const subSearchData = await subSearchRes.json()

      let teamFolderId: string
      if (subSearchData.files && subSearchData.files.length > 0) {
        teamFolderId = subSearchData.files[0].id
      } else {
        const createSub = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: teamName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId]
          })
        })
        const subData = await createSub.json()
        teamFolderId = subData.id
      }

      await supabaseAdmin
        .from('team_google_drive_tokens')
        .update({ folder_id: teamFolderId })
        .eq('team_id', teamId)

      return teamFolderId
    }

    // ==========================================
    // ACTION: CREATE-UPLOAD-SESSION
    // ==========================================
    if (action === 'create-upload-session') {
      const { filename, mimeType, fileSize, description } = body
      if (!filename) {
        return new Response(JSON.stringify({ error: 'filename is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      const accessToken = await getValidGoogleAccessToken()
      const folderId = await getOrCreateTeamFolder(accessToken)

      // Initiate Resumable Upload Session with Google Drive API
      const metadata = {
        name: filename,
        parents: [folderId],
        description: description || `Uploaded via HackSync by ${user.user_metadata?.full_name || user.email}`
      }

      // Extract origin so Google Drive enables CORS for direct browser PUT upload
      const clientOrigin = req.headers.get('origin') || 'http://localhost:5173'

      let activeAccessToken = accessToken
      let initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeAccessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType || 'video/mp4',
          'X-Upload-Content-Length': String(fileSize || 0),
          'Origin': clientOrigin
        },
        body: JSON.stringify(metadata)
      })

      // If Google returns 401 (e.g. stale/invalidated token), auto-refresh token and retry once
      if (initRes.status === 401) {
        try {
          activeAccessToken = await getValidGoogleAccessToken(true)
          initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${activeAccessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
              'X-Upload-Content-Type': mimeType || 'video/mp4',
              'X-Upload-Content-Length': String(fileSize || 0),
              'Origin': clientOrigin
            },
            body: JSON.stringify(metadata)
          })
        } catch (rErr) {
          console.error('Auto token refresh on 401 failed:', rErr)
        }
      }

      if (!initRes.ok) {
        const errText = await initRes.text()
        return new Response(JSON.stringify({ error: 'Failed to initiate Google Drive upload session', details: errText }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: initRes.status
        })
      }

      const uploadUrl = initRes.headers.get('Location')
      if (!uploadUrl) {
        return new Response(JSON.stringify({ error: 'No upload location returned by Google Drive' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      return new Response(JSON.stringify({ uploadUrl, folderId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ==========================================
    // ACTION: COMPLETE-UPLOAD
    // ==========================================
    if (action === 'complete-upload') {
      const { googleFileId, title, description, sizeBytes, mimeType, sharingAccess } = body
      if (!googleFileId || !title) {
        return new Response(JSON.stringify({ error: 'googleFileId and title are required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      const accessToken = await getValidGoogleAccessToken()

      // Handle optional explicit hackathon submission sharing set by leader during upload
      let finalSharingAccess = 'restricted'
      if (isLeader && sharingAccess === 'anyone_with_link') {
        try {
          const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${googleFileId}/permissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone'
            })
          })
          if (permRes.ok) {
            finalSharingAccess = 'anyone_with_link'
          } else {
            console.warn('Failed to set public permission on Google Drive file:', await permRes.text())
          }
        } catch (pErr) {
          console.error('Error applying anyone_with_link permission during upload:', pErr)
        }
      }

      // Fetch the REAL webViewLink directly from Google Drive API
      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${googleFileId}?fields=id,name,webViewLink,webContentLink,size,mimeType`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )

      if (!fileRes.ok) {
        const errText = await fileRes.text()
        return new Response(JSON.stringify({ error: 'Failed to fetch video details from Google Drive', details: errText }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: fileRes.status
        })
      }

      const fileData = await fileRes.json()
      const webViewLink = fileData.webViewLink
      if (!webViewLink) {
        return new Response(JSON.stringify({ error: 'Google Drive did not return a valid webViewLink' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      // Store metadata in Supabase team_demo_videos
      const { data: insertedVideo, error: insertErr } = await supabaseAdmin
        .from('team_demo_videos')
        .insert({
          team_id: teamId,
          uploader_id: user.id,
          title: title.trim(),
          description: description ? description.trim() : null,
          google_file_id: googleFileId,
          web_view_link: webViewLink,
          size_bytes: sizeBytes || (fileData.size ? parseInt(fileData.size) : 0),
          mime_type: mimeType || fileData.mimeType || 'video/mp4',
          sharing_access: finalSharingAccess
        })
        .select('*, profiles(display_name)')
        .single()

      if (insertErr) {
        throw insertErr
      }

      return new Response(JSON.stringify({
        success: true,
        video: insertedVideo
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ==========================================
    // ACTION: UPDATE-SHARING (Leader only)
    // ==========================================
    if (action === 'update-sharing') {
      if (!isLeader) {
        return new Response(JSON.stringify({ error: 'Only the team leader can update video sharing permissions' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      const { videoId, sharingAccess } = body
      if (!videoId || (sharingAccess !== 'restricted' && sharingAccess !== 'anyone_with_link')) {
        return new Response(JSON.stringify({ error: 'Valid videoId and sharingAccess ("restricted" or "anyone_with_link") are required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Validate video belongs to team
      const { data: videoRow, error: vErr } = await supabaseAdmin
        .from('team_demo_videos')
        .select('id, team_id, google_file_id, web_view_link, sharing_access')
        .eq('id', videoId)
        .eq('team_id', teamId)
        .single()

      if (vErr || !videoRow) {
        return new Response(JSON.stringify({ error: 'Video not found in team library' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        })
      }

      const accessToken = await getValidGoogleAccessToken()

      if (sharingAccess === 'anyone_with_link') {
        // Set Google Drive file permission: type="anyone", role="reader"
        // Note: This applies strictly to this single file, NOT the parent folder or other files.
        const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${videoRow.google_file_id}/permissions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        })

        if (!permRes.ok) {
          const errText = await permRes.text()
          return new Response(JSON.stringify({ 
            error: 'Failed to update Google Drive permission to anyone with the link', 
            details: errText 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          })
        }

        // Fetch fresh webViewLink from Google Drive
        let webViewLink = videoRow.web_view_link
        const freshRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${videoRow.google_file_id}?fields=id,webViewLink`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        if (freshRes.ok) {
          const freshData = await freshRes.json()
          if (freshData.webViewLink) {
            webViewLink = freshData.webViewLink
          }
        }

        const { error: updateErr } = await supabaseAdmin
          .from('team_demo_videos')
          .update({
            sharing_access: 'anyone_with_link',
            web_view_link: webViewLink
          })
          .eq('id', videoId)

        if (updateErr) {
          throw updateErr
        }

        return new Response(JSON.stringify({
          success: true,
          sharingAccess: 'anyone_with_link',
          webViewLink
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      } else {
        // Revert to restricted: find and remove any "anyone" permission
        try {
          const listPermsRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${videoRow.google_file_id}/permissions?fields=permissions(id,type,role)`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          )
          if (listPermsRes.ok) {
            const permsData = await listPermsRes.json()
            const anyonePerm = (permsData.permissions || []).find((p: any) => p.type === 'anyone')
            if (anyonePerm?.id) {
              await fetch(`https://www.googleapis.com/drive/v3/files/${videoRow.google_file_id}/permissions/${anyonePerm.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
              })
            }
          }
        } catch (delPermErr) {
          console.warn('Error removing anyone permission:', delPermErr)
        }

        const { error: updateErr } = await supabaseAdmin
          .from('team_demo_videos')
          .update({
            sharing_access: 'restricted'
          })
          .eq('id', videoId)

        if (updateErr) {
          throw updateErr
        }

        return new Response(JSON.stringify({
          success: true,
          sharingAccess: 'restricted',
          webViewLink: videoRow.web_view_link
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }
    }

    // ==========================================
    // ACTION: DELETE-VIDEO
    // ==========================================
    if (action === 'delete-video') {
      const { videoId } = body
      if (!videoId) {
        return new Response(JSON.stringify({ error: 'videoId is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Check permissions: only uploader or team leader can delete
      const { data: videoRow, error: vErr } = await supabaseAdmin
        .from('team_demo_videos')
        .select('id, uploader_id, google_file_id, team_id')
        .eq('id', videoId)
        .eq('team_id', teamId)
        .single()

      if (vErr || !videoRow) {
        return new Response(JSON.stringify({ error: 'Video not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        })
      }

      if (videoRow.uploader_id !== user.id && !isLeader) {
        return new Response(JSON.stringify({ error: 'Not authorized to delete this video' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      // Attempt to delete from Google Drive
      try {
        const accessToken = await getValidGoogleAccessToken()
        await fetch(`https://www.googleapis.com/drive/v3/files/${videoRow.google_file_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      } catch (gErr) {
        console.warn('Could not delete from Google Drive directly:', gErr)
      }

      // Delete from Supabase
      const { error: delErr } = await supabaseAdmin
        .from('team_demo_videos')
        .delete()
        .eq('id', videoId)

      if (delErr) {
        throw delErr
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ==========================================
    // ACTION: CHECK-PROCESSING
    // ==========================================
    if (action === 'check-processing') {
      const { googleFileId } = body
      if (!googleFileId) {
        return new Response(JSON.stringify({ error: 'googleFileId is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      try {
        const accessToken = await getValidGoogleAccessToken()
        const checkRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${googleFileId}?fields=id,name,mimeType,videoMediaMetadata,thumbnailLink,webViewLink`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )

        if (!checkRes.ok) {
          const errText = await checkRes.text()
          console.warn('Google Drive check status returned non-200:', checkRes.status, errText)
          // Return 200 with isProcessing: true so client polling continues smoothly
          return new Response(JSON.stringify({
            isProcessing: true,
            isPlayable: false,
            message: 'Google Drive is currently processing or rate-limiting check. Retrying...',
            googleStatus: checkRes.status
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          })
        }

        const fileData = await checkRes.json()
        // Google Drive sets videoMediaMetadata and thumbnailLink once processing is complete
        const isPlayable = Boolean(fileData.videoMediaMetadata?.durationMillis || fileData.thumbnailLink)

        return new Response(JSON.stringify({
          isProcessing: !isPlayable,
          isPlayable,
          thumbnailLink: fileData.thumbnailLink || null,
          videoMediaMetadata: fileData.videoMediaMetadata || null,
          webViewLink: fileData.webViewLink
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      } catch (err: any) {
        console.warn('Error during check-processing:', err.message)
        return new Response(JSON.stringify({
          isProcessing: true,
          isPlayable: false,
          warning: err.message,
          message: 'Transcoding check in progress'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })

  } catch (err: any) {
    console.error('google-drive edge function error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

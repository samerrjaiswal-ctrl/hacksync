import { supabase } from './supabase';
import type { DemoVideoData, GoogleDriveStatus } from '../types';

/**
 * Fetch Google Drive connection status for the team
 */
export async function getGoogleDriveStatus(teamId: string, isLeader: boolean): Promise<GoogleDriveStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('google-drive', {
      body: { action: 'get-status', teamId }
    });

    if (error || !data) {
      // Graceful fallback to database RPC if edge function is not deployed yet
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_team_google_drive_status', {
        p_team_id: teamId
      });

      if (!rpcErr && rpcData && rpcData.length > 0) {
        return {
          isConnected: Boolean(rpcData[0].is_connected),
          googleEmail: rpcData[0].google_email || null,
          isConfigured: true,
          isLeader: Boolean(rpcData[0].is_leader)
        };
      }

      return {
        isConnected: false,
        googleEmail: null,
        isConfigured: false,
        isLeader
      };
    }

    return {
      isConnected: Boolean(data.isConnected),
      googleEmail: data.googleEmail || null,
      isConfigured: Boolean(data.isConfigured),
      isLeader: Boolean(data.isLeader),
      lastUpdated: data.lastUpdated || null
    };
  } catch (err) {
    console.warn('Error checking Google Drive status:', err);
    return {
      isConnected: false,
      googleEmail: null,
      isConfigured: false,
      isLeader
    };
  }
}

/**
 * Get official Google OAuth 2.0 authorization URL from backend
 */
export async function getGoogleAuthUrl(teamId: string): Promise<{ authUrl?: string; error?: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke('google-drive', {
    body: { action: 'get-auth-url', teamId }
  });

  if (error || !data) {
    return { 
      error: 'SERVER_ERROR', 
      message: error?.message || 'Failed to request Google authorization from server' 
    };
  }

  if (data.error) {
    return { error: data.error, message: data.message || data.error };
  }

  return { authUrl: data.authUrl };
}

/**
 * Disconnect Google Drive from the team (Leader only)
 */
export async function disconnectGoogleDrive(teamId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('google-drive', {
    body: { action: 'disconnect', teamId }
  });

  if (error || !data?.success) {
    return { success: false, error: error?.message || data?.error || 'Failed to disconnect Google Drive' };
  }

  return { success: true };
}

/**
 * Complete OAuth callback after redirect
 */
export async function completeOAuthCallback(teamId: string, code: string, state: string): Promise<{ success: boolean; googleEmail?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('google-drive', {
    body: { action: 'oauth-callback', teamId, code, state }
  });

  if (error || !data?.success) {
    return { success: false, error: error?.message || data?.error || 'Failed to complete Google Drive connection' };
  }

  return { success: true, googleEmail: data.googleEmail };
}

/**
 * Fetch all demo videos for the current team from Supabase
 */
export async function fetchTeamVideos(teamId: string): Promise<DemoVideoData[]> {
  const { data, error } = await supabase
    .from('team_demo_videos')
    .select('*, profiles(display_name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    // Only log if it's an unexpected database error, not table-not-yet-created (PGRST205)
    if ((error as any).code !== 'PGRST205') {
      console.error('Failed to fetch demo videos:', error);
    }
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    teamId: row.team_id,
    uploaderId: row.uploader_id,
    uploaderName: row.profiles?.display_name || 'Team Member',
    title: row.title,
    description: row.description || '',
    googleFileId: row.google_file_id,
    webViewLink: row.web_view_link,
    sizeBytes: Number(row.size_bytes || 0),
    mimeType: row.mime_type || 'video/mp4',
    createdAt: new Date(row.created_at)
  }));
}

/**
 * Upload demo video:
 * 1. Obtains Resumable Upload session URL from Google Drive API
 * 2. Streams video directly to Google Drive (tracks real progress)
 * 3. Finalizes metadata in Supabase and extracts real webViewLink
 */
export async function uploadDemoVideo(
  teamId: string,
  file: File,
  title: string,
  description: string,
  onProgress: (progressPct: number) => void
): Promise<DemoVideoData> {
  // 1. Initialize resumable upload session via Edge Function
  const { data: sessionData, error: sessionErr } = await supabase.functions.invoke('google-drive', {
    body: {
      action: 'create-upload-session',
      teamId,
      filename: file.name,
      mimeType: file.type || 'video/mp4',
      fileSize: file.size,
      description
    }
  });

  if (sessionErr || !sessionData?.uploadUrl) {
    throw new Error(sessionErr?.message || sessionData?.error || 'Failed to initialize Google Drive upload session. Ensure Google Drive is connected.');
  }

  const uploadUrl = sessionData.uploadUrl;

  // 2. Stream video file directly to Google Drive via XMLHttpRequest for accurate progress tracking
  const googleFile = await new Promise<{ id: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(98, Math.round((event.loaded / event.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const resp = JSON.parse(xhr.responseText);
          resolve(resp);
        } catch {
          reject(new Error('Invalid response from Google Drive'));
        }
      } else {
        reject(new Error(`Google Drive upload failed with HTTP status ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error occurred while uploading to Google Drive'));
    xhr.ontimeout = () => reject(new Error('Upload to Google Drive timed out'));

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(file);
  });

  onProgress(99);

  // 3. Finalize upload metadata and retrieve the real webViewLink from Google Drive API
  const { data: completeData, error: completeErr } = await supabase.functions.invoke('google-drive', {
    body: {
      action: 'complete-upload',
      teamId,
      googleFileId: googleFile.id,
      title,
      description,
      sizeBytes: file.size,
      mimeType: file.type || 'video/mp4'
    }
  });

  if (completeErr || !completeData?.video) {
    throw new Error(completeErr?.message || completeData?.error || 'Failed to complete video registration with team library.');
  }

  onProgress(100);

  const row = completeData.video;
  return {
    id: row.id,
    teamId: row.team_id,
    uploaderId: row.uploader_id,
    uploaderName: row.profiles?.display_name || 'Team Member',
    title: row.title,
    description: row.description || '',
    googleFileId: row.google_file_id,
    webViewLink: row.web_view_link,
    sizeBytes: Number(row.size_bytes || 0),
    mimeType: row.mime_type || 'video/mp4',
    createdAt: new Date(row.created_at)
  };
}

/**
 * Delete a demo video from Google Drive and remove from database
 */
export async function deleteDemoVideo(teamId: string, videoId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('google-drive', {
    body: { action: 'delete-video', teamId, videoId }
  });

  if (error || !data?.success) {
    // Attempt fallback delete via database
    const { error: dbErr } = await supabase
      .from('team_demo_videos')
      .delete()
      .eq('id', videoId);

    if (dbErr) {
      throw new Error(dbErr.message || 'Failed to delete demo video');
    }
  }

  return true;
}

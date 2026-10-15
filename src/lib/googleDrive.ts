import { supabase } from './supabase';
import type { DemoVideoData, GoogleDriveStatus, VideoSharingAccess } from '../types';

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
    sharingAccess: (row.sharing_access as VideoSharingAccess) || 'restricted',
    createdAt: new Date(row.created_at)
  }));
}

/**
 * Upload demo video:
 * 1. Obtains Resumable Upload session URL from Google Drive API
 * 2. Streams video directly to Google Drive (tracks real progress)
 * 3. Finalizes metadata in Supabase and extracts real webViewLink
 * 4. Supports optional Hackathon submission sharing ("anyone_with_link")
 */
export async function uploadDemoVideo(
  teamId: string,
  file: File,
  title: string,
  description: string,
  onProgress: (progressPct: number) => void,
  sharingAccess: VideoSharingAccess = 'restricted'
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
    let msg = sessionErr?.message || sessionData?.error || 'Failed to initialize Google Drive upload session. Ensure Google Drive is connected.';
    if ((sessionErr as any)?.context) {
      try {
        const ctx = (sessionErr as any).context;
        let rawBody = '';
        if (typeof ctx.json === 'function') {
          const body = await ctx.json();
          rawBody = JSON.stringify(body);
          msg = body.details || body.error || body.message || rawBody;
        } else if (typeof ctx === 'object') {
          rawBody = JSON.stringify(ctx);
          msg = ctx.details || ctx.error || ctx.message || rawBody;
        } else if (typeof ctx === 'string') {
          rawBody = ctx;
          try {
            const parsed = JSON.parse(ctx);
            msg = parsed.details || parsed.error || parsed.message || ctx;
          } catch {
            msg = ctx;
          }
        }

        if (rawBody.includes('SERVICE_DISABLED') || rawBody.includes('has not been used in project')) {
          msg = 'Google Drive API is not enabled in your Google Cloud project! Please enable it at: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=251655105969 then click Retry Upload.';
        } else if (rawBody.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || rawBody.includes('insufficientPermissions')) {
          msg = 'Google Drive access was not checked during login. Please reconnect Google Drive and make sure to check the Google Drive permission box.';
        } else if (rawBody.includes('UNAUTHENTICATED') || rawBody.includes('Invalid Credentials') || rawBody.includes('authError')) {
          msg = 'Google session needs a fresh token because the Drive API was just enabled. Please click below to reconnect Google Drive.';
        }
      } catch {
        // keep fallback msg
      }
    }
    throw new Error(msg);
  }

  const uploadUrl = sessionData.uploadUrl;

  // 2. Stream video file directly to Google Drive
  let googleFile: { id: string };
  try {
    googleFile = await new Promise<{ id: string }>((resolve, reject) => {
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
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid response from Google Drive'));
          }
        } else {
          reject(new Error(`Google Drive upload failed with HTTP status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('XHR_NETWORK_ERROR'));
      xhr.ontimeout = () => reject(new Error('Upload to Google Drive timed out'));

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);
      xhr.send(file);
    });
  } catch (err: any) {
    if (err.message === 'XHR_NETWORK_ERROR') {
      try {
        onProgress(50);
        const fRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'video/mp4',
            'Content-Range': `bytes 0-${file.size - 1}/${file.size}`
          },
          body: file
        });

        if (fRes.ok || fRes.status === 200 || fRes.status === 201) {
          googleFile = await fRes.json();
        } else {
          throw new Error(`Upload failed with HTTP status ${fRes.status}`);
        }
      } catch (fErr: any) {
        throw new Error('Network error uploading to Google Drive. Please ensure "http://localhost:5173" is in Authorized JavaScript origins in Google Cloud Console.');
      }
    } else {
      throw err;
    }
  }

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
      mimeType: file.type || 'video/mp4',
      sharingAccess
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
    sharingAccess: (row.sharing_access as VideoSharingAccess) || sharingAccess || 'restricted',
    createdAt: new Date(row.created_at)
  };
}

/**
 * Update sharing permission for hackathon submissions
 * - "restricted": only people with permission
 * - "anyone_with_link": public viewer for hackathon judges & organizers
 */
export async function updateVideoSharing(
  teamId: string,
  videoId: string,
  sharingAccess: VideoSharingAccess
): Promise<{ success: boolean; sharingAccess: VideoSharingAccess; webViewLink: string }> {
  const { data, error } = await supabase.functions.invoke('google-drive', {
    body: {
      action: 'update-sharing',
      teamId,
      videoId,
      sharingAccess
    }
  });

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || data?.details || 'Failed to update video sharing permissions.');
  }

  return {
    success: true,
    sharingAccess: data.sharingAccess,
    webViewLink: data.webViewLink
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

/**
 * Probe Google Drive direct thumbnail to verify if transcoding has finished.
 * Google Drive generates web thumbnails only after transcoding the video.
 */
export async function probeGoogleDriveReadiness(googleFileId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(false);
    }, 3500);

    img.onload = () => {
      clearTimeout(timeout);
      // Thumbnail loaded successfully: Google Drive video has finished processing
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    img.src = `https://drive.google.com/thumbnail?id=${googleFileId}&sz=w800&t=${Date.now()}`;
  });
}

/**
 * Check Google Drive video processing and playback readiness
 */
export async function checkVideoProcessing(
  teamId: string, 
  googleFileId: string
): Promise<{ 
  isProcessing: boolean; 
  isPlayable: boolean; 
  thumbnailLink?: string | null; 
  webViewLink?: string | null;
  videoMediaMetadata?: any | null;
  error?: string | null;
}> {
  const fallbackThumbnail = `https://drive.google.com/thumbnail?id=${googleFileId}&sz=w800`;
  const fallbackWebView = `https://drive.google.com/file/d/${googleFileId}/view?usp=drivesdk`;

  try {
    // 1. Try checking via backend Edge Function
    const { data, error } = await supabase.functions.invoke('google-drive', {
      body: { action: 'check-processing', teamId, googleFileId }
    });

    if (!error && data) {
      if (data.isPlayable) {
        return {
          isProcessing: false,
          isPlayable: true,
          thumbnailLink: data.thumbnailLink || fallbackThumbnail,
          webViewLink: data.webViewLink || fallbackWebView,
          videoMediaMetadata: data.videoMediaMetadata || null,
          error: null
        };
      }

      if (data.isProcessing) {
        // Also probe directly from client in case backend check is conservative or rate-limited
        const isProbePlayable = await probeGoogleDriveReadiness(googleFileId);
        if (isProbePlayable) {
          return {
            isProcessing: false,
            isPlayable: true,
            thumbnailLink: fallbackThumbnail,
            webViewLink: fallbackWebView,
            error: null
          };
        }

        return {
          isProcessing: true,
          isPlayable: false,
          thumbnailLink: data.thumbnailLink || fallbackThumbnail,
          videoMediaMetadata: data.videoMediaMetadata || null,
          error: null
        };
      }
    }

    // 2. If Edge Function returned error or non-2xx, run direct browser thumbnail probe
    console.warn('Edge function check returned status error, verifying with direct Google Drive probe:', error?.message);
    const isProbePlayable = await probeGoogleDriveReadiness(googleFileId);
    if (isProbePlayable) {
      return {
        isProcessing: false,
        isPlayable: true,
        thumbnailLink: fallbackThumbnail,
        webViewLink: fallbackWebView,
        error: null
      };
    }

    // If neither verified yet, treat as still in progress rather than a hard failure
    return {
      isProcessing: true,
      isPlayable: false,
      thumbnailLink: fallbackThumbnail,
      error: null
    };

  } catch (err: any) {
    console.warn('Network exception checking video processing, falling back to direct probe:', err);
    const isProbePlayable = await probeGoogleDriveReadiness(googleFileId);
    if (isProbePlayable) {
      return {
        isProcessing: false,
        isPlayable: true,
        thumbnailLink: fallbackThumbnail,
        webViewLink: fallbackWebView,
        error: null
      };
    }

    return {
      isProcessing: true,
      isPlayable: false,
      error: null
    };
  }
}

# HackSync

HackSync is a modern, real-time team collaboration platform tailored for hackathons. It features robust authentication, guest joining flows, team management, and decentralized WebRTC peer-to-peer (P2P) file sharing.

## Architecture

- **Frontend**: React, Vite, TypeScript, TailwindCSS
- **Backend & Auth**: Supabase (PostgreSQL, Supabase Auth)
- **Signaling**: Supabase Realtime (`workspace-[teamId]` channels)
- **File Transfer**: WebRTC DataChannels (P2P) with IndexedDB local persistence

## Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Environment Variables**:
   Copy `.env.example` to `.env.local` and add your Supabase URL and Anon Key.
   ```env
   VITE_SUPABASE_URL="your-supabase-url"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```
3. **Run development server**:
   ```bash
   npm run dev
   ```

## Build Instructions

To build the project for production, run:
```bash
npm run build
```
This runs TypeScript checking (`tsc -b`) followed by the Vite production build.

---

## Technical Workflows

### Authentication Flow
The application uses Supabase Auth for leader signup/login. 
- Authenticated users automatically receive a record in the `profiles` table.
- Authorization relies on RLS policies protecting the `team_members` and `shared_files` tables.

### Team Membership & Guest Join
- **Team Leaders** can create teams, which generates a unique, 6-character team invite code.
- **Guests** can join a team by supplying their name and the 6-character code on the landing page.
- The `guest-join` Edge Function validates the code, issues a signed JWT, and bypasses unauthorized user creation safely.

### Peer-to-Peer File Transfer
To strictly avoid cloud-storage dependencies and costs, file contents are **never** uploaded to Supabase Storage.
1. When a user "uploads" a file, the `File` object is stored in the browser's native **IndexedDB**, and only the file *metadata* (name, size, type) is pushed to Supabase.
2. The UI checks if the original file uploader is online in the workspace.
3. If online, another peer can request the file. The signaling routes over Supabase Realtime.
4. The uploader accepts the request, and a dedicated `RTCDataChannel` streams the binary data chunks (64KB) directly from the uploader to the downloader.
5. The downloader uses backpressure-aware chunking to re-assemble the `Blob` and triggers a native browser download.

### Signaling Dependencies
WebRTC connection negotiation (Offer/Answer/ICE) happens entirely via Supabase Realtime broadcast channels `workspace-[teamId]`.

### STUN/TURN Limitations
The WebRTC stack currently uses Google's public STUN servers for NAT traversal.
- **Limitation**: If both peers are behind strict Symmetric NATs (e.g., enterprise firewalls), a direct STUN connection will fail.
- **Solution**: A TURN server is required for reliable fallback. TURN credentials are not exposed in client-visible environment variables. A future backend API must securely provision short-lived TURN credentials.

### Remaining Unverified Behavior
1. **End-to-End File Transfer Validation**: While local unit/build checks passed for the WebRTC components, a live browser-to-browser data transfer test is pending to verify chunk reassembly under heavy network latency.
2. **TURN Server Verification**: The fallback to TURN has not been tested live, as no TURN server is currently provisioned.
3. **Edge Function Deployments**: The `guest-join` Edge Function functionality assumes it is actively deployed and functional on the backend.

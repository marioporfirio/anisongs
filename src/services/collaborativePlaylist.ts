// src/services/collaborativePlaylist.ts

interface PlaylistCollaborator {
  id: string;
  playlist_id: number;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'declined';
}

class CollaborativePlaylistService {
  async inviteCollaborator(
    playlistId: number,
    userEmail: string,
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/playlists/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, userEmail, role }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Erro ao convidar colaborador' };
      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao convidar colaborador' };
    }
  }

  async acceptInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, action: 'accept' }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao aceitar convite' };
    }
  }

  async getCollaborators(playlistId: number): Promise<PlaylistCollaborator[]> {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/collaborators`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async canEditPlaylist(playlistId: number): Promise<boolean> {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/can-edit`);
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.canEdit;
    } catch {
      return false;
    }
  }

  async getPendingInvitations(): Promise<PlaylistCollaborator[]> {
    try {
      const res = await fetch('/api/invitations/pending');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  // Real-time features are not available without Supabase Realtime.
  // These are stubs to maintain interface compatibility.
  async startCollaborativeSession(): Promise<void> {
    // no-op
  }

  async stopCollaborativeSession(): Promise<void> {
    // no-op
  }
}

export const collaborativePlaylistService = new CollaborativePlaylistService();
export default collaborativePlaylistService;

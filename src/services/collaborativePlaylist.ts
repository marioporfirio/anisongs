// src/services/collaborativePlaylist.ts
import { createBrowserClient } from '@supabase/ssr';

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

interface PlaylistChange {
  id: string;
  playlist_id: number;
  user_id: string;
  action: 'add_theme' | 'remove_theme' | 'reorder_themes' | 'update_metadata';
  data: Record<string, unknown>;
  created_at: string;
}

interface ActiveUser {
  user_id: string;
  username: string;
  last_seen: string;
  cursor_position?: number;
}

interface CollaborativeSession {
  playlist_id: number;
  active_users: ActiveUser[];
}

interface SubscriptionPair {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presence: any;
}

class CollaborativePlaylistService {
  private supabase;
  private activeSubscriptions = new Map<number, SubscriptionPair>();
  private sessionHeartbeat?: NodeJS.Timeout;

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Invite user to collaborate on playlist
  async inviteCollaborator(
    playlistId: number,
    userEmail: string,
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Check if user exists - simplified approach
      let invitedUserId: string | null = null;
      
      try {
        // Try profiles table first (most likely to have email)
        const { data: profileUser, error: profileError } = await this.supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .single();
        
        if (!profileError && profileUser) {
          invitedUserId = profileUser.id;
        } else {
          // If profiles doesn't work, the user might not be registered yet
          // For now, we'll show a more helpful error message
          console.log('User not found in profiles table:', profileError);
          return { 
            success: false, 
            error: 'Usuário não encontrado. Verifique se o email está correto e se o usuário já se cadastrou no sistema.' 
          };
        }
      } catch (error) {
        console.error('Error searching for user:', error);
        return { success: false, error: 'Erro ao buscar usuário' };
      }

      // Check if already invited
      const { data: existing } = await this.supabase
        .from('playlist_collaborators')
        .select('id, status')
        .eq('playlist_id', playlistId)
        .eq('user_id', invitedUserId)
        .single();

      if (existing) {
        if (existing.status === 'pending') {
          return { success: false, error: 'Usuário já foi convidado e o convite está pendente' };
        } else if (existing.status === 'accepted') {
          return { success: false, error: 'Usuário já é colaborador desta playlist' };
        } else if (existing.status === 'declined') {
          // Se foi recusado, permitir novo convite atualizando o existente
          const { error: updateError } = await this.supabase
            .from('playlist_collaborators')
            .update({
              status: 'pending',
              role: role,
              invited_at: new Date().toISOString(),
              accepted_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
            
          if (updateError) {
            return { success: false, error: 'Erro ao reenviar convite' };
          }
          
          return { success: true };
        }
      }

      // Create invitation
      const { error: inviteError } = await this.supabase
        .from('playlist_collaborators')
        .insert({
          playlist_id: playlistId,
          user_id: invitedUserId,
          role,
          invited_by: currentUser.user.id,
          status: 'pending'
        });

      if (inviteError) {
        return { success: false, error: inviteError.message };
      }

      // TODO: Send email notification
      console.log('📧 Invitation sent to:', userEmail);

      return { success: true };
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      return { success: false, error: 'Failed to send invitation' };
    }
  }

  // Accept collaboration invitation
  async acceptInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('playlist_collaborators')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Get collaborators for a playlist
  async getCollaborators(playlistId: number): Promise<PlaylistCollaborator[]> {
    try {
      const { data, error } = await this.supabase
        .from('playlist_collaborators')
        .select(`
          *,
          profiles!user_id(username, email),
          invited_by_profile!invited_by(username)
        `)
        .eq('playlist_id', playlistId);

      if (error) {
        // Se a tabela não existir, retornar array vazio em vez de erro
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('Tabela playlist_collaborators não existe ainda. Execute o SQL de criação.');
          return [];
        }
        console.error('Error fetching collaborators:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      return [];
    }
  }

  // Record a playlist change
  async recordChange(
    playlistId: number,
    action: PlaylistChange['action'],
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) return;

      const { error } = await this.supabase
        .from('playlist_changes')
        .insert({
          playlist_id: playlistId,
          user_id: currentUser.user.id,
          action,
          data
        });

      if (error) {
        console.error('Error recording change:', error);
      }
    } catch (error) {
      console.error('Error recording change:', error);
    }
  }

  // Get recent changes for a playlist
  async getRecentChanges(playlistId: number, limit = 50): Promise<PlaylistChange[]> {
    try {
      const { data, error } = await this.supabase
        .from('playlist_changes')
        .select(`
          *,
          profiles!user_id(username)
        `)
        .eq('playlist_id', playlistId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Se a tabela não existir, retornar array vazio em vez de erro
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('Tabela playlist_changes não existe ainda. Execute o SQL de criação.');
          return [];
        }
        console.error('Error fetching changes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching changes:', error);
      return [];
    }
  }

  // Start collaborative session
  async startCollaborativeSession(
    playlistId: number,
    onUpdate: (session: CollaborativeSession) => void,
    onUserJoined: (user: ActiveUser) => void,
    onUserLeft: (userId: string) => void
  ): Promise<void> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) return;

      // Subscribe to playlist changes
      const changesSubscription = this.supabase
        .channel(`playlist-changes-${playlistId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'playlist_changes',
            filter: `playlist_id=eq.${playlistId}`
          },
          (payload) => {
            console.log('📝 Playlist change received:', payload);
            // Handle real-time changes
            this.handleRealtimeChange(payload.new as PlaylistChange);
          }
        )
        .subscribe();

      // Subscribe to user presence
      const presenceSubscription = this.supabase
        .channel(`playlist-presence-${playlistId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = presenceSubscription.presenceState();
          const activeUsers = Object.values(state).flat().map((presence: Record<string, unknown>) => ({
             user_id: (presence.user_id as string) || '',
             username: (presence.username as string) || 'Unknown',
             last_seen: (presence.last_seen as string) || new Date().toISOString(),
             cursor_position: presence.cursor_position as number | undefined
           })) as ActiveUser[];
          onUpdate({ playlist_id: playlistId, active_users: activeUsers });
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('👋 User joined:', newPresences);
          newPresences.forEach((presence: Record<string, unknown>) => {
             const user: ActiveUser = {
               user_id: (presence.user_id as string) || '',
               username: (presence.username as string) || 'Unknown',
               last_seen: (presence.last_seen as string) || new Date().toISOString(),
               cursor_position: presence.cursor_position as number | undefined
             };
             onUserJoined(user);
           });
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('👋 User left:', leftPresences);
          leftPresences.forEach((presence: Record<string, unknown>) => {
             onUserLeft((presence.user_id as string) || '');
           });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track user presence
            await presenceSubscription.track({
              user_id: currentUser.user.id,
              username: currentUser.user.user_metadata?.display_name || 
                       currentUser.user.user_metadata?.username || 
                       currentUser.user.user_metadata?.name || 
                       currentUser.user.email?.split('@')[0] || 
                       'Usuário',
              last_seen: new Date().toISOString()
            });
          }
        });

      // Store subscriptions for cleanup
      this.activeSubscriptions.set(playlistId, {
        changes: changesSubscription,
        presence: presenceSubscription
      });

      // Start heartbeat to maintain presence
      this.sessionHeartbeat = setInterval(async () => {
        await presenceSubscription.track({
          user_id: currentUser.user.id,
          username: currentUser.user.user_metadata?.display_name || 
                   currentUser.user.user_metadata?.username || 
                   currentUser.user.user_metadata?.name || 
                   currentUser.user.email?.split('@')[0] || 
                   'Usuário',
          last_seen: new Date().toISOString()
        });
      }, 30000); // Update every 30 seconds

      console.log('🤝 Collaborative session started for playlist:', playlistId);
    } catch (error) {
      console.error('Error starting collaborative session:', error);
    }
  }

  // Stop collaborative session
  async stopCollaborativeSession(playlistId: number): Promise<void> {
    const subscriptions = this.activeSubscriptions.get(playlistId);
    if (subscriptions) {
      await subscriptions.changes.unsubscribe();
      await subscriptions.presence.unsubscribe();
      this.activeSubscriptions.delete(playlistId);
    }

    if (this.sessionHeartbeat) {
      clearInterval(this.sessionHeartbeat);
      this.sessionHeartbeat = undefined;
    }

    // Collaborative session stopped
  }

  // Handle real-time changes
  private handleRealtimeChange(change: PlaylistChange): void {
    console.log('🔄 Processing real-time change:', change);
    
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('playlist-change', {
      detail: change
    }));
  }

  // Check if user can edit playlist
  async canEditPlaylist(playlistId: number): Promise<boolean> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) return false;

      // Check if user is owner
      const { data: playlist } = await this.supabase
        .from('playlists')
        .select('user_id')
        .eq('id', playlistId)
        .single();

      if (playlist?.user_id === currentUser.user.id) {
        return true;
      }

      // Check if user is collaborator with edit permissions
      const { data: collaborator } = await this.supabase
        .from('playlist_collaborators')
        .select('role')
        .eq('playlist_id', playlistId)
        .eq('user_id', currentUser.user.id)
        .eq('status', 'accepted')
        .single();

      return collaborator?.role === 'editor';
    } catch (error) {
      console.error('Error checking edit permissions:', error);
      return false;
    }
  }

  // Get user's pending invitations
  async getPendingInvitations(): Promise<PlaylistCollaborator[]> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) return [];

      const { data, error } = await this.supabase
        .from('playlist_collaborators')
        .select(`
          *,
          playlists:playlist_id(name, description),
          invited_by_profile:invited_by(username)
        `)
        .eq('user_id', currentUser.user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching pending invitations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }
}

// Singleton instance
export const collaborativePlaylistService = new CollaborativePlaylistService();
export default collaborativePlaylistService;
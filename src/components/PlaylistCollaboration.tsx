// src/components/PlaylistCollaboration.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';

// Dynamically import the service to avoid SSR issues
let collaborativePlaylistService: typeof import('@/services/collaborativePlaylist').default | null = null;
if (typeof window !== 'undefined') {
  import('@/services/collaborativePlaylist').then(module => {
    collaborativePlaylistService = module.default;
  });
}

interface PlaylistCollaborationProps {
  playlistId: number;
  isOwner: boolean;
  className?: string;
}

interface ActiveUser {
  user_id: string;
  username: string;
  last_seen: string;
  cursor_position?: number;
}

interface Collaborator {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  profiles?: { username: string; email: string };
  invited_by_profile?: { username: string };
}

interface CollaborativeSession {
  playlist_id: number;
  active_users: ActiveUser[];
}

interface PlaylistChange {
  action: string;
  profiles?: { username: string };
  created_at: string;
}

export default function PlaylistCollaboration({ 
  playlistId, 
  isOwner, 
  className = '' 
}: PlaylistCollaborationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [recentChanges, setRecentChanges] = useState<PlaylistChange[]>([]);
  const [showChanges, setShowChanges] = useState(false);

  // Load collaborators
  const loadCollaborators = useCallback(async () => {
    if (!collaborativePlaylistService) return;
    const data = await collaborativePlaylistService.getCollaborators(playlistId);
    setCollaborators(data as Collaborator[]);
  }, [playlistId]);

  // Load recent changes
  const loadRecentChanges = useCallback(async () => {
    if (!collaborativePlaylistService) return;
    const changes = await collaborativePlaylistService.getRecentChanges(playlistId, 20);
    setRecentChanges(changes);
  }, [playlistId]);

  // Handle user session updates
  const handleSessionUpdate = useCallback((session: CollaborativeSession) => {
    setActiveUsers(session.active_users || []);
  }, []);

  const handleUserJoined = useCallback((user: ActiveUser) => {
    console.log('👋 User joined collaboration:', user.username);
  }, []);

  const handleUserLeft = useCallback((userId: string) => {
    console.log('👋 User left collaboration:', userId);
  }, []);

  // Send invitation
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !collaborativePlaylistService) return;
    
    setIsInviting(true);
    const result = await collaborativePlaylistService.inviteCollaborator(
      playlistId,
      inviteEmail.trim(),
      inviteRole
    );
    
    if (result.success) {
      setInviteEmail('');
      await loadCollaborators();
      // Mostrar notificação de sucesso
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <div>
            <div class="font-semibold">Convite enviado!</div>
            <div class="text-sm opacity-90">O usuário receberá uma notificação para aceitar</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
    } else {
      // Mostrar notificação de erro
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <div>
            <div class="font-semibold">Erro ao enviar convite</div>
            <div class="text-sm opacity-90">${result.error}</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
    }
    
    setIsInviting(false);
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Tem certeza que deseja remover este colaborador?')) return;
    
    // TODO: Implement remove collaborator API call
    console.log('Remove collaborator:', collaboratorId);
  };

  // Initialize collaborative session
  useEffect(() => {
    if (isVisible && collaborativePlaylistService) {
      loadCollaborators();
      loadRecentChanges();
      
      // Start collaborative session
      collaborativePlaylistService.startCollaborativeSession(
        playlistId,
        handleSessionUpdate,
        handleUserJoined,
        handleUserLeft
      );
      
      // Listen for real-time changes
      const handlePlaylistChange = () => {
        loadRecentChanges();
      };
      
      window.addEventListener('playlist-change', handlePlaylistChange as EventListener);
      
      return () => {
        if (collaborativePlaylistService) {
          collaborativePlaylistService.stopCollaborativeSession(playlistId);
        }
        window.removeEventListener('playlist-change', handlePlaylistChange as EventListener);
      };
    }
  }, [isVisible, playlistId, loadCollaborators, loadRecentChanges, handleSessionUpdate, handleUserJoined, handleUserLeft]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-yellow-400';
      case 'editor': return 'text-green-400';
      case 'viewer': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'declined': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="w-full p-4 flex items-center justify-between text-white hover:bg-slate-700/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          <span className="font-semibold">Colaboração</span>
          {activeUsers.length > 0 && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              {activeUsers.length} online
            </span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 transition-transform ${isVisible ? 'rotate-180' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isVisible && (
        <div className="p-4 border-t border-slate-300/10 space-y-6">
          {/* Active Users */}
          {activeUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Usuários Ativos</h4>
              <div className="flex flex-wrap gap-2">
                {activeUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-2 bg-green-600/20 border border-green-500/30 rounded-full px-3 py-1"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-300">{user.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite New Collaborator */}
          {isOwner && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Convidar Colaborador</h4>
              
              {/* Info sobre como funciona */}
              <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-blue-300">
                    <div className="font-medium mb-1">Como funciona:</div>
                    <div className="space-y-1 text-blue-200">
                      <div>• O usuário deve estar cadastrado no sistema</div>
                      <div>• Ele receberá um convite com status &quot;pending&quot;</div>
                      <div>• Pode aceitar/recusar na seção de colaboração</div>
                      <div>• <strong>Editor:</strong> pode adicionar/remover músicas</div>
                      <div>• <strong>Visualizador:</strong> apenas visualiza</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email do usuário cadastrado"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={isInviting || !inviteEmail.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isInviting ? 'Enviando...' : 'Convidar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collaborators List */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Colaboradores</h4>
            <div className="space-y-2">
              {collaborators.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum colaborador ainda.</p>
              ) : (
                collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between bg-slate-700/50 rounded p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {collaborator.profiles?.username || 'Unknown'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${getRoleColor(collaborator.role)}`}>
                          {collaborator.role}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(collaborator.status)}`}>
                          {collaborator.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {collaborator.profiles?.email || 'No email'}
                      </p>
                      {collaborator.invited_by_profile && (
                        <p className="text-xs text-gray-500">
                          Convidado por {collaborator.invited_by_profile.username}
                        </p>
                      )}
                    </div>
                    {isOwner && collaborator.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remover colaborador"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Changes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-300">Atividade Recente</h4>
              <button
                onClick={() => setShowChanges(!showChanges)}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {showChanges ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showChanges && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recentChanges.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma atividade recente.</p>
                ) : (
                  recentChanges.map((change, index) => (
                    <div key={index} className="text-xs text-gray-400 bg-slate-700/30 rounded p-2">
                      <span className="text-white">{change.profiles?.username || 'Usuário'}</span>
                      {' '}
                      <span className="text-gray-300">
                        {change.action === 'add_theme' && 'adicionou uma música'}
                        {change.action === 'remove_theme' && 'removeu uma música'}
                        {change.action === 'reorder_themes' && 'reordenou as músicas'}
                        {change.action === 'update_metadata' && 'atualizou informações'}
                      </span>
                      {' '}
                      <span className="text-gray-500">
                        {new Date(change.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
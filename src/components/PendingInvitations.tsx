// src/components/PendingInvitations.tsx
"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

interface PendingInvitation {
  id: string;
  playlist_id: number;
  role: 'editor' | 'viewer';
  invited_at: string;
  playlists: {
    name: string;
  }[];
}

interface PendingInvitationsProps {
  invitations: PendingInvitation[];
}

export default function PendingInvitations({ invitations: initialInvitations }: PendingInvitationsProps) {
  console.log('🎯 DEBUG: PendingInvitations renderizando');
  console.log('🎯 DEBUG: Convites recebidos:', initialInvitations?.length || 0);
  console.log('🎯 DEBUG: Dados recebidos:', initialInvitations);
  
  const [invitations, setInvitations] = useState(initialInvitations);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          action
        })
      });
      
      if (response.ok) {
        // Remover convite da lista
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        
        // Mostrar notificação de sucesso
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <div>
              <div class="font-semibold">Convite ${action === 'accept' ? 'aceito' : 'recusado'}!</div>
              <div class="text-sm opacity-90">${action === 'accept' ? 'Você agora pode colaborar na playlist' : 'Convite foi recusado'}</div>
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
        throw new Error('Falha ao processar convite');
      }
    } catch (error) {
      console.error('Erro ao processar convite:', error);
      
      // Mostrar notificação de erro
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <div>
            <div class="font-semibold">Erro ao processar convite</div>
            <div class="text-sm opacity-90">Tente novamente mais tarde</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'editor' ? 'Editor' : 'Visualizador';
  };

  const getRoleColor = (role: string) => {
    return role === 'editor' ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' : 'bg-green-600/20 text-green-300 border-green-500/30';
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
        Convites Pendentes
        <span className="bg-yellow-500 text-black text-sm px-2 py-1 rounded-full font-medium">
          {invitations.length}
        </span>
      </h2>
      
      <div className="space-y-4">
        {invitations.map((invitation) => {
          const isProcessing = processingIds.has(invitation.id);
          
          return (
            <div key={invitation.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg p-6 hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">
                      {invitation.playlists?.[0]?.name || 'Playlist'}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded border ${getRoleColor(invitation.role)}`}>
                      {getRoleLabel(invitation.role)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-400">
                    <p>
                      <span className="text-gray-300">Convidado por:</span>{' '}
                      <span className="text-white font-medium">
                        Proprietário da playlist
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-300">Há:</span>{' '}
                      {formatDistanceToNow(new Date(invitation.invited_at), { 
                        addSuffix: false, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    {invitation.role === 'editor' ? (
                      <span>✏️ Poderá adicionar, remover e reordenar músicas</span>
                    ) : (
                      <span>👁️ Poderá visualizar e reproduzir a playlist</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                    disabled={isProcessing}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    {isProcessing ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    Aceitar
                  </button>
                  
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                    disabled={isProcessing}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    {isProcessing ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    Recusar
                  </button>
                  
                  <Link
                    href={`/playlists/${invitation.playlist_id}`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium text-center"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Ver Playlist
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
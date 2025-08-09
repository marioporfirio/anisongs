// src/app/test-player/page.tsx
"use client";

import AudioPlayer from '@/components/AudioPlayer';
import PlaylistCollaboration from '@/components/PlaylistCollaboration';
import { type EnrichedPlaylistTheme } from '@/app/playlists/[id]/page';

// Dados de exemplo para testar o player
const testThemes: EnrichedPlaylistTheme[] = [
  {
    playlist_theme_id: 1,
    theme_id: 1,
    title: "Teste de Áudio 1",
    animeName: "Anime Demo",
    animeSlug: "anime-demo",
    type: "OP1",
    videoLink: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
  },
  {
    playlist_theme_id: 2,
    theme_id: 2,
    title: "Teste de Áudio 2",
    animeName: "Anime Demo 2",
    animeSlug: "anime-demo-2",
    type: "ED1",
    videoLink: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
  },
  {
    playlist_theme_id: 3,
    theme_id: 3,
    title: "Teste de Áudio 3",
    animeName: "Anime Demo 3",
    animeSlug: "anime-demo-3",
    type: "OP2",
    videoLink: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
  }
];

export default function TestPlayerPage() {
  return (
    <main className="container mx-auto p-4 md:p-8 text-white min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Teste do Audio Player</h1>
        <p className="text-lg text-gray-400">
          Esta página demonstra o funcionamento do player de áudio com arquivos de exemplo.
        </p>
        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <h2 className="text-lg font-semibold text-yellow-400 mb-2">Instruções:</h2>
          <ul className="text-sm text-yellow-200 space-y-1">
            <li>• Clique no botão de play para iniciar a reprodução</li>
            <li>• Use os controles de próxima/anterior para navegar</li>
            <li>• Teste o modo shuffle e repeat</li>
            <li>• Ajuste o volume conforme necessário</li>
            <li>• Clique nas músicas da playlist para trocar diretamente</li>
          </ul>
        </div>
      </div>
      
      <div className="mb-6">
        <AudioPlayer themes={testThemes} />
      </div>
      
      {/* Collaboration Demo */}
      <div className="mb-6">
        <PlaylistCollaboration 
          playlistId={1}
          isOwner={true}
        />
      </div>
      
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Status do Player</h2>
        <p className="text-gray-400">
          O player está configurado com {testThemes.length} faixas de exemplo.
          Sistema simplificado e otimizado para melhor performance!
        </p>
        
        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-medium">Funcionalidades Básicas:</h3>
          <ul className="text-sm text-gray-300 space-y-1 ml-4">
            <li>✅ Reprodução de áudio</li>
            <li>✅ Controles de play/pause/stop</li>
            <li>✅ Navegação entre faixas</li>
            <li>✅ Modo shuffle inteligente</li>
            <li>✅ Modo repeat (off/track/playlist)</li>
            <li>✅ Controle de volume</li>
            <li>✅ Barra de progresso interativa</li>
            <li>✅ Lista de reprodução</li>
            <li>✅ Indicadores de status</li>
            <li>✅ Tratamento robusto de erros</li>
          </ul>
          
          <h3 className="text-lg font-medium mt-4">Funcionalidades Avançadas:</h3>
          <ul className="text-sm text-green-300 space-y-1 ml-4">
            <li>🤝 Playlists colaborativas em tempo real</li>
            <li>👥 Presença de usuários em tempo real</li>
            <li>📝 Histórico de atividades</li>
            <li>🔄 Sincronização automática</li>
          </ul>
          
          <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
            <h4 className="text-indigo-300 font-semibold mb-2">Como Testar:</h4>
            <ul className="text-sm text-indigo-200 space-y-1">
              <li>• Teste todos os controles de reprodução</li>
              <li>• Experimente o modo shuffle e repeat</li>
              <li>• Ajuste o volume e navegue pela barra de progresso</li>
              <li>• Clique nas músicas da playlist para trocar</li>
              <li>• Abra múltiplas abas para testar colaboração</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
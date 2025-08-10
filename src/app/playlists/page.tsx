// src/app/playlists/page.tsx

import { createServerClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createPlaylist } from '@/app/actions';
import PlaylistItemClient from './PlaylistItemClient';
import PendingInvitations from '@/components/PendingInvitations';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Playlist { id: number; name: string; description: string | null; }

interface CollaborativePlaylist {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string;
  my_role: 'editor' | 'viewer';
  profiles: {
    username: string;
  } | null;
}

interface PublicPlaylist {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
  } | null;
  _count: {
    playlist_themes: number;
  };
}

interface PendingInvitation {
  id: string;
  playlist_id: number;
  role: 'editor' | 'viewer';
  invited_at: string;
  playlists: {
    name: string;
  }[];
}

// Buscar playlists do usuário logado
async function fetchUserPlaylists(supabase: SupabaseClient): Promise<Playlist[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: playlists, error } = await supabase.from('playlists').select('id, name, description').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.error("Erro ao buscar playlists na página:", error); return []; }
  return playlists;
}

// Buscar convites pendentes do usuário
async function fetchPendingInvitations(supabase: SupabaseClient): Promise<PendingInvitation[]> {
  console.log('🔍 DEBUG: Iniciando fetchPendingInvitations');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('❌ DEBUG: Usuário não autenticado');
    return [];
  }
  
  console.log('👤 DEBUG: Usuário logado:', user.id);
  console.log('📧 DEBUG: Buscando convites para user_id:', user.id);
  
  const { data: invitations, error } = await supabase
    .from('playlist_collaborators')
    .select(`
      id,
      playlist_id,
      role,
      invited_at,
      playlists(name)
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });
    
  if (error) {
    console.error("❌ DEBUG: Erro ao buscar convites:", error);
    return [];
  }
  
  console.log('📊 DEBUG: Convites encontrados:', invitations?.length || 0);
  console.log('📊 DEBUG: Dados completos:', invitations);
  
  return invitations || [];
}

// Buscar playlists colaborativas do usuário
async function fetchCollaborativePlaylists(supabase: SupabaseClient): Promise<CollaborativePlaylist[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  // Primeiro, buscar os IDs das playlists onde o usuário é colaborador
  const { data: collaborations, error: collaborationsError } = await supabase
    .from('playlist_collaborators')
    .select('playlist_id, role')
    .eq('user_id', user.id)
    .eq('status', 'accepted');
    
  if (collaborationsError) {
    console.error("Erro ao buscar colaborações:", collaborationsError);
    return [];
  }
  
  if (!collaborations || collaborations.length === 0) {
    return [];
  }
  
  // Extrair os IDs das playlists
  const playlistIds = collaborations.map(c => c.playlist_id);
  
  // Buscar as playlists colaborativas
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select(`
      id,
      name,
      description,
      created_at,
      user_id,
      profiles!user_id(username)
    `)
    .in('id', playlistIds)
    .order('name', { ascending: true });
    
  if (error) {
    console.error("Erro ao buscar playlists colaborativas:", error);
    return [];
  }
  
  // Adicionar o role do usuário em cada playlist
  const playlistsWithRole = (playlists || []).map(playlist => {
    const collaboration = collaborations.find(c => c.playlist_id === playlist.id);
    return {
      ...playlist,
      my_role: collaboration?.role || 'viewer',
      profiles: Array.isArray(playlist.profiles) ? playlist.profiles[0] || null : playlist.profiles
    };
  });
  
  return playlistsWithRole;
}

// Buscar playlists públicas
async function fetchPublicPlaylists(supabase: SupabaseClient): Promise<PublicPlaylist[]> {
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select(`
      id,
      name,
      description,
      created_at,
      user_id
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Erro ao buscar playlists públicas:', error);
    return [];
  }

  if (!playlists || playlists.length === 0) {
    return [];
  }

  // Buscar dados do usuário atual
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  // Filtrar playlists para excluir as do usuário atual
  const filteredPlaylists = playlists.filter(playlist => 
    !currentUser || playlist.user_id !== currentUser.id
  );
  
  if (filteredPlaylists.length === 0) {
    return [];
  }
  
  // Tentar buscar nomes de usuários via RPC function ou profiles
  const userIds = [...new Set(filteredPlaylists.map(p => p.user_id))];
  
  // Tentar buscar dados via RPC function que acessa auth.users
  const userProfiles = new Map();
  try {
    // Primeiro tentar RPC function personalizada
    const { data: userMetadata, error: rpcError } = await supabase
      .rpc('get_users_metadata', { user_ids: userIds });
    
    if (!rpcError && userMetadata && Array.isArray(userMetadata)) {
       userMetadata.forEach((userData: { id: string; display_name?: string; username?: string; name?: string; user_name?: string; email?: string }) => {
         const displayName = userData.display_name || 
                            userData.username || 
                            userData.name || 
                            userData.user_name ||
                            userData.email?.split('@')[0] ||
                            'Usuário da Comunidade';
         userProfiles.set(userData.id, displayName);
       });
    } else {
       // Fallback: tentar tabela profiles
       const { data: profiles, error } = await supabase
         .from('profiles')
         .select('id, username, full_name')
         .in('id', userIds);
       
       if (!error && profiles) {
         profiles.forEach(profile => {
           const displayName = profile.username || 
                              profile.full_name || 
                              'Usuário da Comunidade';
           userProfiles.set(profile.id, displayName);
         });
       }
     }
   } catch (error) {
     console.error('Erro ao buscar dados de usuários:', error);
   }
   
   // Criar mapa final de usuários
   const userMap = new Map();
   userIds.forEach(userId => {
     const displayName = userProfiles.get(userId) || 'Usuário da Comunidade';
     userMap.set(userId, displayName);
   });

  // Buscar contagem de músicas para cada playlist filtrada
  const playlistsWithCount = await Promise.all(
    filteredPlaylists.map(async (playlist) => {
      const { count } = await supabase
        .from('playlist_themes')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', playlist.id);
      
      return {
        ...playlist,
        profiles: {
          username: userMap.get(playlist.user_id) || 'Usuário da Comunidade'
        },
        _count: {
          playlist_themes: count || 0
        }
      };
    })
  );
  return playlistsWithCount;
}

export default async function PlaylistsPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() { return (await cookies()).getAll(); },
        async setAll(cookiesToSet) {
          const cookieStore = await cookies();
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } 
          catch { /* Ignorar */ }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  console.log('🔐 DEBUG: Session:', !!session);
  console.log('🔐 DEBUG: User:', !!user, user?.id);
  console.log('🔐 DEBUG: User email:', user?.email);
  
  if (user) {
    console.log('✅ DEBUG: Usuário autenticado, executando código...');
    // Usuário logado - mostrar suas playlists, playlists colaborativas E playlists públicas
    const playlists = await fetchUserPlaylists(supabase);
    const collaborativePlaylists = await fetchCollaborativePlaylists(supabase);
    const publicPlaylists = await fetchPublicPlaylists(supabase);
    
    let pendingInvitations: PendingInvitation[] = [];
    try {
      console.log('🚀 DEBUG: Chamando fetchPendingInvitations...');
      pendingInvitations = await fetchPendingInvitations(supabase);
      console.log('✅ DEBUG: fetchPendingInvitations concluído:', pendingInvitations);
    } catch (error) {
      console.error('❌ DEBUG: Erro ao chamar fetchPendingInvitations:', error);
    }

    return (
      <main className="container mx-auto p-4 md:p-8 text-white">
        <div className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold">Playlists</h1></div>
        
        {/* Seção: Convites Pendentes */}
        <PendingInvitations invitations={pendingInvitations} />
        
        {/* Seção: Minhas Playlists */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Minhas Playlists</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4">Criar Nova Playlist</h3>
                <form action={createPlaylist} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nome</label>
                    <input type="text" name="name" id="name" required className="mt-1 block w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600/80 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300">Descrição (Opcional)</label>
                    <textarea name="description" id="description" rows={3} className="mt-1 block w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600/80 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                  </div>
                  <div className="flex items-center">
                    <input id="isPublic" name="isPublic" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-500 rounded focus:ring-indigo-500" />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-300">Tornar pública</label>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40">Criar</button>
                </form>
              </div>
            </div>
            <div className="md:col-span-2">
              {playlists.length > 0 ? (
                <div className="space-y-4">
                  {playlists.map(playlist => (
                    <PlaylistItemClient 
                      key={playlist.id} 
                      id={playlist.id} 
                      name={playlist.name} 
                      description={playlist.description} 
                    />
                  ))}
                </div>
              ) : ( <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6 text-center text-gray-400">Você ainda não criou nenhuma playlist.</div> )}
            </div>
          </div>
        </div>

        {/* Seção: Playlists Colaborativas */}
        {collaborativePlaylists.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Playlists Colaborativas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collaborativePlaylists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlists/${playlist.id}`}
                  className="block group"
                >
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/80 rounded-xl p-6 hover:bg-gray-700/50 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                            {playlist.name}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded border ${
                            playlist.my_role === 'editor' 
                              ? 'bg-green-600/20 border-green-500/30 text-green-300'
                              : 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                          }`}>
                            {playlist.my_role === 'editor' ? 'Editor' : 'Visualizador'}
                          </span>
                        </div>
                        {playlist.description && (
                          <p className="text-gray-400 text-sm mt-2 line-clamp-3">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span>por {playlist.profiles?.username || 'Usuário'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                        <span className="text-blue-400">Colaborativa</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Seção: Playlists Públicas */}
        <div>
          <h2 className="text-3xl font-bold mb-6">Playlists Públicas da Comunidade</h2>
          {publicPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicPlaylists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlists/${playlist.id}`}
                  className="block group"
                >
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/80 rounded-xl p-6 hover:bg-gray-700/50 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                          {playlist.name}
                        </h3>
                        {playlist.description && (
                          <p className="text-gray-400 text-sm mt-2 line-clamp-3">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          🎵 {playlist._count.playlist_themes} {playlist._count.playlist_themes === 1 ? 'música' : 'músicas'}
                        </span>
                      </div>
                      
                      <div className="text-right">
                         <p className="text-gray-400">
                           por {playlist.profiles?.username || 'Usuário Anônimo'}
                         </p>
                        <p className="text-gray-500 text-xs">
                          {formatDistanceToNow(new Date(playlist.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center text-purple-400 text-sm font-medium group-hover:text-purple-300 transition-colors">
                      Ver playlist
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-2xl font-bold mb-2">Nenhuma playlist pública encontrada</h3>
              <p className="text-gray-400">
                Seja o primeiro a criar uma playlist pública!
              </p>
            </div>
          )}
        </div>
      </main>
    );
  } else {
    // Usuário não logado - mostrar playlists públicas
    const publicPlaylists = await fetchPublicPlaylists(supabase);

    return (
      <main className="container mx-auto p-4 md:p-8 text-white">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Playlists Públicas</h1>
          <p className="text-gray-400 text-lg">
            Descubra playlists criadas pela comunidade
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Fazer Login para Criar Playlists
            </Link>
          </div>
        </div>

        {publicPlaylists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicPlaylists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/playlists/${playlist.id}`}
                className="block group"
              >
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/80 rounded-xl p-6 hover:bg-gray-700/50 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                        {playlist.name}
                      </h3>
                      {playlist.description && (
                        <p className="text-gray-400 text-sm mt-2 line-clamp-3">
                          {playlist.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        🎵 {playlist._count.playlist_themes} {playlist._count.playlist_themes === 1 ? 'música' : 'músicas'}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-gray-400">
                        por {playlist.profiles?.username || 'Usuário Anônimo'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(playlist.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center text-purple-400 text-sm font-medium group-hover:text-purple-300 transition-colors">
                    Ver playlist
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-2xl font-bold mb-2">Nenhuma playlist pública encontrada</h3>
            <p className="text-gray-400">
              Seja o primeiro a criar uma playlist pública!
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Fazer Login
            </Link>
          </div>
        )}
      </main>
    );
  }
}
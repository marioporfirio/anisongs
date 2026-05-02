// src/app/playlists/page.tsx
import { auth } from '@/auth'
import { sql } from '@/lib/db'
import { createPlaylist } from '@/app/actions'
import PlaylistItemClient from './PlaylistItemClient'
import PendingInvitations from '@/components/PendingInvitations'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Playlist { id: number; name: string; description: string | null; }
interface CollaborativePlaylist { id: number; name: string; description: string | null; created_at: string; user_id: string; my_role: 'editor' | 'viewer'; owner_name: string; }
interface PublicPlaylist { id: number; name: string; description: string | null; created_at: string; user_id: string; owner_name: string; theme_count: number; }
interface PendingInvitation { id: string; playlist_id: number; role: 'editor' | 'viewer'; invited_at: string; playlists: { name: string }[]; }

async function fetchUserPlaylists(userId: string): Promise<Playlist[]> {
  const rows = await sql`
    SELECT id, name, description FROM playlists
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
  return rows as Playlist[]
}

async function fetchPendingInvitations(userId: string): Promise<PendingInvitation[]> {
  const rows = await sql`
    SELECT
      pc.id::text,
      pc.playlist_id,
      pc.role,
      pc.invited_at,
      json_build_array(json_build_object('name', p.name)) AS playlists
    FROM playlist_collaborators pc
    JOIN playlists p ON p.id = pc.playlist_id
    WHERE pc.user_id = ${userId} AND pc.status = 'pending'
    ORDER BY pc.invited_at DESC
  `
  return rows as PendingInvitation[]
}

async function fetchCollaborativePlaylists(userId: string): Promise<CollaborativePlaylist[]> {
  const rows = await sql`
    SELECT
      p.id, p.name, p.description, p.created_at, p.user_id,
      pc.role AS my_role,
      COALESCE(up.display_name, u.display_name, 'Usuário') AS owner_name
    FROM playlist_collaborators pc
    JOIN playlists p ON p.id = pc.playlist_id
    LEFT JOIN user_profiles up ON up.user_id = p.user_id
    LEFT JOIN users u ON u.id = p.user_id
    WHERE pc.user_id = ${userId} AND pc.status = 'accepted'
    ORDER BY p.name ASC
  `
  return rows as CollaborativePlaylist[]
}

async function fetchPublicPlaylists(currentUserId?: string): Promise<PublicPlaylist[]> {
  const rows = await sql`
    SELECT
      p.id, p.name, p.description, p.created_at, p.user_id,
      COALESCE(up.display_name, u.display_name, 'Usuário') AS owner_name,
      COUNT(pt.id)::int AS theme_count
    FROM playlists p
    LEFT JOIN user_profiles up ON up.user_id = p.user_id
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN playlist_themes pt ON pt.playlist_id = p.id
    WHERE p.is_public = true
      AND (${currentUserId ?? null}::text IS NULL OR p.user_id != ${currentUserId ?? null})
    GROUP BY p.id, up.display_name, u.display_name
    ORDER BY p.created_at DESC
    LIMIT 50
  `
  return rows as PublicPlaylist[]
}

export default async function PlaylistsPage() {
  const session = await auth()
  const user = session?.user

  if (user) {
    const [playlists, collaborativePlaylists, publicPlaylists, pendingInvitations] = await Promise.all([
      fetchUserPlaylists(user.id),
      fetchCollaborativePlaylists(user.id),
      fetchPublicPlaylists(user.id),
      fetchPendingInvitations(user.id),
    ])

    return (
      <main className="container mx-auto p-4 md:p-8 text-white">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Playlists</h1>
        </div>

        <PendingInvitations invitations={pendingInvitations} />

        {/* Minhas Playlists */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Minhas Playlists</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4">Criar Nova Playlist</h3>
                <form action={createPlaylist} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Nome</label>
                    <input type="text" name="name" required className="mt-1 block w-full bg-slate-700/50 border border-slate-600/80 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Descrição (Opcional)</label>
                    <textarea name="description" rows={3} className="mt-1 block w-full bg-slate-700/50 border border-slate-600/80 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-center">
                    <input id="isPublic" name="isPublic" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-500 rounded" />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-300">Tornar pública</label>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Criar</button>
                </form>
              </div>
            </div>
            <div className="md:col-span-2">
              {playlists.length > 0 ? (
                <div className="space-y-4">
                  {playlists.map(p => (
                    <PlaylistItemClient key={p.id} id={p.id} name={p.name} description={p.description} />
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-300/10 rounded-lg p-6 text-center text-gray-400">
                  Você ainda não criou nenhuma playlist.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Playlists Colaborativas */}
        {collaborativePlaylists.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Playlists Colaborativas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collaborativePlaylists.map(p => (
                <Link key={p.id} href={`/playlists/${p.id}`} className="block group">
                  <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 hover:bg-gray-700/50 transition-all hover:border-blue-500/50">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors line-clamp-2">{p.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded border ${p.my_role === 'editor' ? 'bg-green-600/20 border-green-500/30 text-green-300' : 'bg-blue-600/20 border-blue-500/30 text-blue-300'}`}>
                        {p.my_role === 'editor' ? 'Editor' : 'Visualizador'}
                      </span>
                    </div>
                    {p.description && <p className="text-gray-400 text-sm line-clamp-3">{p.description}</p>}
                    <div className="mt-3 text-sm text-gray-500">por {p.owner_name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <PublicPlaylistsSection playlists={publicPlaylists} />
      </main>
    )
  }

  // Não logado
  const publicPlaylists = await fetchPublicPlaylists()
  return (
    <main className="container mx-auto p-4 md:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Playlists Públicas</h1>
        <p className="text-gray-400 text-lg">Descubra playlists criadas pela comunidade</p>
        <div className="mt-4">
          <Link href="/login" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Fazer Login para Criar Playlists
          </Link>
        </div>
      </div>
      <PublicPlaylistsSection playlists={publicPlaylists} />
    </main>
  )
}

function PublicPlaylistsSection({ playlists }: { playlists: PublicPlaylist[] }) {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Playlists Públicas da Comunidade</h2>
      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map(p => (
            <Link key={p.id} href={`/playlists/${p.id}`} className="block group">
              <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 hover:bg-gray-700/50 transition-all hover:border-purple-500/50">
                <h3 className="text-xl font-bold group-hover:text-purple-400 transition-colors line-clamp-2 mb-2">{p.name}</h3>
                {p.description && <p className="text-gray-400 text-sm line-clamp-3 mb-4">{p.description}</p>}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>🎵 {p.theme_count} {p.theme_count === 1 ? 'música' : 'músicas'}</span>
                  <div className="text-right">
                    <p className="text-gray-400">por {p.owner_name}</p>
                    <p className="text-xs">
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-2xl font-bold mb-2">Nenhuma playlist pública encontrada</h3>
          <p className="text-gray-400">Seja o primeiro a criar uma playlist pública!</p>
        </div>
      )}
    </div>
  )
}

-- Tabelas para Sistema de Colaboração em Playlists
-- Execute este SQL no Supabase SQL Editor

-- Tabela de perfis de usuários (necessária para colaboração)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver perfis públicos
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Política: Usuários podem atualizar seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Tabela para colaboradores de playlist
CREATE TABLE IF NOT EXISTS playlist_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar convites duplicados
  UNIQUE(playlist_id, user_id)
);

-- Tabela para histórico de mudanças na playlist
CREATE TABLE IF NOT EXISTS playlist_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('add_theme', 'remove_theme', 'reorder_themes', 'update_metadata')),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist_id ON playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user_id ON playlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_status ON playlist_collaborators(status);
CREATE INDEX IF NOT EXISTS idx_playlist_changes_playlist_id ON playlist_changes(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_changes_created_at ON playlist_changes(created_at DESC);

-- RLS (Row Level Security) para playlist_collaborators
ALTER TABLE playlist_collaborators ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver colaboradores de playlists que têm acesso
DROP POLICY IF EXISTS "Users can view collaborators of accessible playlists" ON playlist_collaborators;
CREATE POLICY "Users can view collaborators of accessible playlists" ON playlist_collaborators
  FOR SELECT USING (
    -- Pode ver se é colaborador da playlist
    user_id = auth.uid() OR
    -- Pode ver se é dono da playlist
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    ) OR
    -- Pode ver se tem acesso à playlist
    playlist_id IN (
      SELECT playlist_id FROM playlist_collaborators 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Política: Apenas donos podem convidar colaboradores
DROP POLICY IF EXISTS "Playlist owners can invite collaborators" ON playlist_collaborators;
CREATE POLICY "Playlist owners can invite collaborators" ON playlist_collaborators
  FOR INSERT WITH CHECK (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  );

-- Política: Donos podem atualizar convites, usuários podem aceitar/recusar seus próprios
DROP POLICY IF EXISTS "Users can update their own invitations" ON playlist_collaborators;
CREATE POLICY "Users can update their own invitations" ON playlist_collaborators
  FOR UPDATE USING (
    user_id = auth.uid() OR
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  );

-- Política: Apenas donos podem deletar colaboradores
DROP POLICY IF EXISTS "Playlist owners can remove collaborators" ON playlist_collaborators;
CREATE POLICY "Playlist owners can remove collaborators" ON playlist_collaborators
  FOR DELETE USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  );

-- RLS para playlist_changes
ALTER TABLE playlist_changes ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver mudanças de playlists que têm acesso
DROP POLICY IF EXISTS "Users can view changes of accessible playlists" ON playlist_changes;
CREATE POLICY "Users can view changes of accessible playlists" ON playlist_changes
  FOR SELECT USING (
    -- Pode ver se é dono da playlist
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    ) OR
    -- Pode ver se é colaborador da playlist
    playlist_id IN (
      SELECT playlist_id FROM playlist_collaborators 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Política: Colaboradores podem registrar mudanças
DROP POLICY IF EXISTS "Collaborators can record changes" ON playlist_changes;
CREATE POLICY "Collaborators can record changes" ON playlist_changes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      -- É dono da playlist
      playlist_id IN (
        SELECT id FROM playlists WHERE user_id = auth.uid()
      ) OR
      -- É colaborador com permissão de edição
      playlist_id IN (
        SELECT playlist_id FROM playlist_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('editor', 'owner')
      )
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at em playlist_collaborators
DROP TRIGGER IF EXISTS update_playlist_collaborators_updated_at ON playlist_collaborators;
CREATE TRIGGER update_playlist_collaborators_updated_at
  BEFORE UPDATE ON playlist_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE playlist_collaborators IS 'Colaboradores de playlists com roles e status de convite';
COMMENT ON TABLE playlist_changes IS 'Histórico de mudanças realizadas em playlists';
COMMENT ON COLUMN playlist_collaborators.role IS 'Papel do colaborador: owner, editor, viewer';
COMMENT ON COLUMN playlist_collaborators.status IS 'Status do convite: pending, accepted, declined';
COMMENT ON COLUMN playlist_changes.action IS 'Tipo de ação: add_theme, remove_theme, reorder_themes, update_metadata';
COMMENT ON COLUMN playlist_changes.data IS 'Dados adicionais da ação em formato JSON';
-- Script para debugar e corrigir convites pendentes
-- Execute este SQL no Supabase SQL Editor

-- 1. Verificar todos os convites existentes
SELECT 
  pc.id,
  pc.playlist_id,
  pc.user_id,
  pc.role,
  pc.status,
  pc.invited_at,
  pc.accepted_at,
  p.name as playlist_name,
  invited_by_profile.username as invited_by,
  user_profile.username as invited_user
FROM playlist_collaborators pc
LEFT JOIN playlists p ON pc.playlist_id = p.id
LEFT JOIN profiles invited_by_profile ON pc.invited_by = invited_by_profile.id
LEFT JOIN profiles user_profile ON pc.user_id = user_profile.id
ORDER BY pc.invited_at DESC;

-- 2. Verificar convites pendentes especificamente
SELECT 
  pc.id,
  pc.playlist_id,
  pc.user_id,
  pc.role,
  pc.status,
  pc.invited_at,
  p.name as playlist_name,
  invited_by_profile.username as invited_by,
  user_profile.username as invited_user,
  user_profile.email as invited_email
FROM playlist_collaborators pc
LEFT JOIN playlists p ON pc.playlist_id = p.id
LEFT JOIN profiles invited_by_profile ON pc.invited_by = invited_by_profile.id
LEFT JOIN profiles user_profile ON pc.user_id = user_profile.id
WHERE pc.status = 'pending'
ORDER BY pc.invited_at DESC;

-- 3. Verificar se há problemas com os relacionamentos
SELECT 
  'Convites sem playlist' as issue,
  COUNT(*) as count
FROM playlist_collaborators pc
LEFT JOIN playlists p ON pc.playlist_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'Convites sem usuário convidado' as issue,
  COUNT(*) as count
FROM playlist_collaborators pc
LEFT JOIN profiles user_profile ON pc.user_id = user_profile.id
WHERE user_profile.id IS NULL

UNION ALL

SELECT 
  'Convites sem quem convidou' as issue,
  COUNT(*) as count
FROM playlist_collaborators pc
LEFT JOIN profiles invited_by_profile ON pc.invited_by = invited_by_profile.id
WHERE invited_by_profile.id IS NULL;

-- 4. Testar a query que a aplicação usa
SELECT 
  pc.id,
  pc.playlist_id,
  pc.role,
  pc.invited_at,
  p.name as playlist_name,
  invited_by_profile.username
FROM playlist_collaborators pc
LEFT JOIN playlists p ON pc.playlist_id = p.id
LEFT JOIN profiles invited_by_profile ON pc.invited_by = invited_by_profile.id
WHERE pc.status = 'pending'
ORDER BY pc.invited_at DESC;

-- 5. Se quiser resetar um convite para testar novamente:
-- UNCOMMENT as linhas abaixo e substitua os valores
-- IMPORTANTE: UUIDs devem estar entre aspas simples
-- DELETE FROM playlist_collaborators 
-- WHERE playlist_id = 10 AND user_id = '5573ea58-460d-46e0-9687-f8305a7d7ba1';

-- Exemplo de como deletar convite específico:
-- DELETE FROM playlist_collaborators 
-- WHERE id = 'ID_DO_CONVITE_AQUI';

-- Para deletar todos os convites de uma playlist:
-- DELETE FROM playlist_collaborators 
-- WHERE playlist_id = 10;

-- Para deletar convites de um usuário específico:
-- DELETE FROM playlist_collaborators 
-- WHERE user_id = '5573ea58-460d-46e0-9687-f8305a7d7ba1';

-- 6. Verificar usuários na tabela profiles
SELECT 
  id,
  email,
  username,
  full_name
FROM profiles
ORDER BY created_at DESC;

-- 7. Verificar se o usuário atual tem convites
-- Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que deveria receber o convite
SELECT 
  pc.id,
  pc.playlist_id,
  pc.role,
  pc.status,
  pc.invited_at,
  p.name as playlist_name,
  invited_by_profile.username as invited_by
FROM playlist_collaborators pc
LEFT JOIN playlists p ON pc.playlist_id = p.id
LEFT JOIN profiles invited_by_profile ON pc.invited_by = invited_by_profile.id
LEFT JOIN profiles user_profile ON pc.user_id = user_profile.id
WHERE user_profile.email = 'SEU_EMAIL_AQUI'
ORDER BY pc.invited_at DESC;
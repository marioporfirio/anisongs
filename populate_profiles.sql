-- Script para popular a tabela profiles com dados dos usuários
-- Execute este SQL no Supabase SQL Editor

-- Primeiro, vamos ver os dados disponíveis em auth.users
SELECT 
  id, 
  email, 
  raw_user_meta_data,
  created_at
FROM auth.users;

-- Agora vamos atualizar a tabela profiles com os dados corretos
UPDATE profiles 
SET 
  email = auth_users.email,
  username = COALESCE(
    auth_users.raw_user_meta_data->>'username',
    auth_users.raw_user_meta_data->>'display_name', 
    auth_users.raw_user_meta_data->>'name',
    split_part(auth_users.email, '@', 1)
  ),
  full_name = COALESCE(
    auth_users.raw_user_meta_data->>'full_name',
    auth_users.raw_user_meta_data->>'name',
    auth_users.raw_user_meta_data->>'display_name',
    split_part(auth_users.email, '@', 1)
  ),
  updated_at = NOW()
FROM auth.users AS auth_users
WHERE profiles.id = auth_users.id;

-- Verificar o resultado
SELECT 
  id, 
  email, 
  username, 
  full_name, 
  created_at,
  updated_at
FROM profiles
ORDER BY created_at;

-- Se ainda houver campos null, vamos forçar valores padrão
UPDATE profiles 
SET 
  email = COALESCE(email, 'user_' || id || '@example.com'),
  username = COALESCE(username, 'user_' || SUBSTRING(id::text, 1, 8)),
  full_name = COALESCE(full_name, 'Usuário ' || SUBSTRING(id::text, 1, 8))
WHERE email IS NULL OR username IS NULL OR full_name IS NULL;

-- Verificação final
SELECT 
  'Tabela profiles populada com sucesso!' as status,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as usuarios_com_email
FROM profiles;

-- Mostrar dados finais
SELECT 
  SUBSTRING(id::text, 1, 8) as id_short,
  email,
  username,
  full_name
FROM profiles
ORDER BY created_at;
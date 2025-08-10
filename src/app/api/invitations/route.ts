// src/app/api/invitations/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { invitationId, action } = await request.json();
    
    if (!invitationId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) => 
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored for Server Components
            }
          },
        },
      }
    );

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se o convite existe e pertence ao usuário
    const { data: invitation, error: invitationError } = await supabase
      .from('playlist_collaborators')
      .select('*')
      .eq('id', invitationId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o status do convite
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const updateData: {
      status: string;
      updated_at: string;
      accepted_at?: string;
    } = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (action === 'accept') {
      updateData.accepted_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('playlist_collaborators')
      .update(updateData)
      .eq('id', invitationId);

    if (updateError) {
      console.error('Erro ao atualizar convite:', updateError);
      return NextResponse.json(
        { error: 'Erro ao processar convite' },
        { status: 500 }
      );
    }

    // Se aceito, registrar mudança no histórico
    if (action === 'accept') {
      await supabase
        .from('playlist_changes')
        .insert({
          playlist_id: invitation.playlist_id,
          user_id: user.id,
          action: 'update_metadata',
          data: {
            type: 'collaboration_accepted',
            role: invitation.role
          }
        });
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Convite aceito com sucesso!' : 'Convite recusado'
    });

  } catch (error) {
    console.error('Erro na API de convites:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
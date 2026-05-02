// src/app/api/invitations/route.ts
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { invitationId, action } = await request.json();

    if (!invitationId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const rows = await sql`
      SELECT * FROM playlist_collaborators
      WHERE id = ${invitationId}
        AND user_id = ${userId}
        AND status = 'pending'
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    if (action === 'accept') {
      await sql`
        UPDATE playlist_collaborators
        SET status = ${newStatus}, accepted_at = NOW(), updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    } else {
      await sql`
        UPDATE playlist_collaborators
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Convite aceito com sucesso!' : 'Convite recusado',
    });
  } catch (error) {
    console.error('Erro na API de convites:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

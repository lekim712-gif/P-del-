import { csvProfesores } from '@/lib/services/profesores';
import { hoyISO } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const mes = new URL(req.url).searchParams.get('mes') ?? hoyISO().slice(0, 7);
  return new Response(csvProfesores(mes), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="profesores_${mes}.csv"` },
  });
}

import { csvCuotas } from '@/lib/services/cuotas';
import { hoyISO } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const mes = new URL(req.url).searchParams.get('mes') ?? hoyISO().slice(0, 7);
  return new Response(csvCuotas(mes), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="cuotas_${mes}.csv"` },
  });
}

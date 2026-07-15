'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { makeApi, ApiError } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays } from 'lucide-react';

interface Booking { id: string; salaId: string; inicio: string; fin: string; estado: string; }

export default function MisReservasPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!token) { router.replace('/login'); return; }
    makeApi(token).get<Booking[]>('/bookings/me')
      .then(setBookings)
      .catch((err) => { if (err instanceof ApiError && err.status === 401) router.replace('/login'); })
      .finally(() => setLoading(false));
  }, [isLoading, token, router]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="animate-pulse">Cargando...</div>
    </div>
  );
  if (!token || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto mt-8 px-4 pb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Mis Reservas</h2>
          <p className="text-sm text-muted-foreground mt-1">Historial de tus reservas</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              {bookings.length} reserva{bookings.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-muted-foreground p-6 text-sm animate-pulse">Cargando...</p>
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground p-6 text-sm">No tienes reservas activas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sala</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.salaId.slice(0, 8)}…</TableCell>
                      <TableCell className="text-sm">{new Date(b.inicio).toLocaleString('es-PE')}</TableCell>
                      <TableCell className="text-sm">{new Date(b.fin).toLocaleString('es-PE')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={b.estado === 'activa' ? 'default' : 'secondary'}
                          className={b.estado === 'activa' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                        >
                          {b.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

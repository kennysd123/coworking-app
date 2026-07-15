'use client';
import { useEffect, useState } from 'react';
import { makeApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableProperties } from 'lucide-react';

interface Booking { id: string; salaId: string; usuarioId: string; inicio: string; fin: string; estado: string; }

export default function AdminReservasPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    makeApi(token).get<Booking[]>('/bookings')
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Todas las Reservas</h2>
        <p className="text-sm text-muted-foreground mt-1">Vista global de todas las reservas del sistema</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-primary" />
            {bookings.length} reserva{bookings.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground p-6 text-sm animate-pulse">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin reservas.</TableCell>
                  </TableRow>
                ) : bookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.salaId.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs">{b.usuarioId.slice(0, 8)}…</TableCell>
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
    </div>
  );
}

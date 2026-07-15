'use client';
import { useEffect, useRef, useState } from 'react';
import { makeApi } from '@/lib/api';
import { createBookingsSocket } from '@/lib/ws';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Socket } from 'socket.io-client';
import { CalendarCheck, Clock } from 'lucide-react';

interface Slot { inicio: string; fin: string; }
interface Props { salaId: string; }

export default function AvailabilityCalendar({ salaId }: Props) {
  const { token } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!salaId || !token) return;

    const desde = new Date();
    const hasta = new Date(Date.now() + 7 * 86_400_000);
    makeApi(token)
      .get<{ slots: Slot[] }>(
        `/bookings/availability?salaId=${salaId}&desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`,
      )
      .then(r => setSlots(r.slots))
      .catch(console.error);

    const socket = createBookingsSocket(token);
    socketRef.current = socket;
    socket.emit('subscribe-sala', { salaId });
    socket.on('booking.created', (ev: { salaId: string; inicio: string; fin: string }) => {
      if (ev.salaId === salaId) {
        setSlots(prev => [...prev, { inicio: ev.inicio, fin: ev.fin }]
          .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()));
      }
    });

    return () => {
      socket.off('booking.created');
      socket.emit('unsubscribe-sala', { salaId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [salaId, token]);

  if (!salaId) return null;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-primary" />
          Disponibilidad — próximos 7 días
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            {slots.length === 0 ? 'Sala libre' : `${slots.length} ocupado${slots.length !== 1 ? 's' : ''}`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {slots.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-emerald-600 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Sala disponible en todo el período
          </div>
        ) : (
          <ul className="space-y-2">
            {slots.map((s, i) => (
              <li key={i} className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-100 text-sm text-red-700">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{new Date(s.inicio).toLocaleString('es-PE')} → {new Date(s.fin).toLocaleString('es-PE')}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

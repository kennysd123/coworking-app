'use client';
import { useState, type FormEvent } from 'react';
import { makeApi, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CalendarPlus, Loader2 } from 'lucide-react';

interface Props { salaId: string; onCreated?: () => void; }

export default function BookingForm({ salaId, onCreated }: Props) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!salaId) {
      toast({ title: 'Error', description: 'Selecciona una sala primero', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await makeApi(token).post('/bookings', { salaId, inicio, fin });
      toast({ title: '¡Reserva creada!', description: 'Tu reserva fue registrada con éxito.' });
      setInicio('');
      setFin('');
      onCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast({ title: 'Sala no disponible', description: 'La sala ya está reservada en ese horario.', variant: 'destructive' });
        } else if (err.status === 422) {
          toast({ title: 'Límite alcanzado', description: err.message, variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Error inesperado', description: 'Inténtalo de nuevo', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-primary" />
          Crear reserva
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inicio">Inicio</Label>
              <Input id="inicio" type="datetime-local" value={inicio} onChange={e => setInicio(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin">Fin</Label>
              <Input id="fin" type="datetime-local" value={fin} onChange={e => setFin(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" disabled={loading || !salaId} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reservando...</> : 'Reservar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

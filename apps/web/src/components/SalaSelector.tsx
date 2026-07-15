'use client';
import { useEffect, useState } from 'react';
import { makeApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface Sala { id: string; nombre: string; capacidad: number; ubicacion: string; activa: boolean; }
interface Props { value: string; onChange: (id: string) => void; }

export default function SalaSelector({ value, onChange }: Props) {
  const { token } = useAuth();
  const [salas, setSalas] = useState<Sala[]>([]);

  useEffect(() => {
    if (!token) return;
    makeApi(token).get<Sala[]>('/salas').then(setSalas).catch(console.error);
  }, [token]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="-- Selecciona una sala --" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {salas.filter(s => s.activa).map(s => (
          <SelectItem key={s.id} value={s.id}>
            <span className="font-medium">{s.nombre}</span>
            <span className="text-muted-foreground text-xs ml-2">· cap. {s.capacidad} · {s.ubicacion}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

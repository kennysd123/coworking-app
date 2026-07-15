import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SalaFormData { nombre: string; capacidad: number; ubicacion: string; activa: boolean; }
interface Props {
  initial?: Partial<SalaFormData>;
  onSubmit: (data: SalaFormData) => Promise<void>;
  submitLabel?: string;
}

export default function SalaForm({ initial, onSubmit, submitLabel = 'Guardar' }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<SalaFormData>({
    nombre: initial?.nombre ?? '',
    capacidad: initial?.capacidad ?? 10,
    ubicacion: initial?.ubicacion ?? '',
    activa: initial?.activa ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al guardar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" placeholder="Ej: Sala Innovación" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="capacidad">Capacidad</Label>
        <Input id="capacidad" type="number" min={1} placeholder="10" value={form.capacidad} onChange={e => setForm(f => ({ ...f, capacidad: Number(e.target.value) }))} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ubicacion">Ubicación</Label>
        <Input id="ubicacion" placeholder="Ej: Piso 2, Ala Norte" value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} required />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" className="rounded" checked={form.activa} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} />
        Sala activa
      </label>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{submitLabel}...</> : submitLabel}
      </Button>
    </form>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { makeApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import SalasTable from '@/components/admin/SalasTable';
import SalaForm from '@/components/admin/SalaForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface Sala { id: string; nombre: string; capacidad: number; ubicacion: string; activa: boolean; }

export default function AdminSalasPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [editing, setEditing] = useState<Sala | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    if (!token) return;
    const data = await makeApi(token).get<Sala[]>('/salas');
    setSalas(data);
  }

  useEffect(() => { void refresh(); }, [token]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(data: { nombre: string; capacidad: number; ubicacion: string; activa: boolean }) {
    await makeApi(token).post('/salas', data);
    toast({ title: 'Sala creada', description: `${data.nombre} fue agregada correctamente.` });
    setShowCreate(false);
    await refresh();
  }

  async function handleUpdate(data: { nombre: string; capacidad: number; ubicacion: string; activa: boolean }) {
    if (!editing) return;
    await makeApi(token).patch(`/salas/${editing.id}`, data);
    toast({ title: 'Sala actualizada', description: `${data.nombre} fue modificada.` });
    setEditing(null);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Salas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {salas.length} sala{salas.length !== 1 ? 's' : ''} registrada{salas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva sala
        </Button>
      </div>

      <SalasTable salas={salas} onEdit={sala => setEditing(sala)} />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear sala</DialogTitle>
          </DialogHeader>
          <SalaForm onSubmit={handleCreate} submitLabel="Crear" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar: {editing?.nombre}</DialogTitle>
          </DialogHeader>
          {editing && <SalaForm initial={editing} onSubmit={handleUpdate} submitLabel="Actualizar" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

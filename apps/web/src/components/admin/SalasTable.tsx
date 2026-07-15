import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Users, MapPin } from 'lucide-react';

interface Sala { id: string; nombre: string; capacidad: number; ubicacion: string; activa: boolean; }
interface Props { salas: Sala[]; onEdit: (sala: Sala) => void; }

export default function SalasTable({ salas, onEdit }: Props) {
  if (salas.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-10">No hay salas registradas.</p>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Cap.</span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Ubicación</span>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salas.map(s => (
              <TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{s.nombre}</TableCell>
                <TableCell>{s.capacidad}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.ubicacion}</TableCell>
                <TableCell>
                  <Badge
                    variant={s.activa ? 'default' : 'secondary'}
                    className={s.activa ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  >
                    {s.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(s)} className="gap-1.5 hover:text-primary">
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

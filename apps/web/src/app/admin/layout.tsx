'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, TableProperties, ArrowLeft, LayoutGrid } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!token) { router.replace('/login'); return; }
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [isLoading, token, user, router]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="animate-pulse">Cargando...</div>
    </div>
  );
  if (!token || !user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-violet-700 text-white px-6 py-3 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Building2 className="w-5 h-5" />
          Admin
          <Badge className="bg-violet-500 text-white text-xs ml-1 border-0">panel</Badge>
        </div>
        <Separator orientation="vertical" className="h-5 bg-violet-500 mx-1" />
        <Link href="/admin/salas">
          <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-violet-600 gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            Salas
          </Button>
        </Link>
        <Link href="/admin/reservas">
          <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-violet-600 gap-1.5">
            <TableProperties className="w-4 h-4" />
            Reservas
          </Button>
        </Link>
        <div className="ml-auto">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-violet-600 gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Vista cliente
            </Button>
          </Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto mt-8 px-4 pb-12">{children}</main>
    </div>
  );
}

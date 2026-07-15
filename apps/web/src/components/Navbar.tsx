'use client';
import Link from 'next/link';
import { Building2, CalendarDays, Settings, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <nav className="bg-white border-b border-border px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary text-lg hover:opacity-80 transition-opacity">
        <Building2 className="w-5 h-5" />
        Coworking
      </Link>
      <div className="flex gap-1 items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
          <span className="font-medium text-foreground">{user.nombre}</span>
          <Badge
            variant={user.role === 'premium' ? 'default' : 'secondary'}
            className={user.role === 'premium' ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            {user.role}
          </Badge>
        </div>
        <Link href="/mis-reservas">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <CalendarDays className="w-4 h-4" />
            Mis reservas
          </Button>
        </Link>
        {user.role === 'admin' && (
          <Link href="/admin/salas">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
              Admin
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </Button>
      </div>
    </nav>
  );
}

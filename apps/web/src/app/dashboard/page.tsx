'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SalaSelector from '@/components/SalaSelector';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import BookingForm from '@/components/BookingForm';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function DashboardPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const [salaId, setSalaId] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!token) router.replace('/login');
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
      <main className="max-w-3xl mx-auto mt-8 px-4 pb-12 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Reserva un espacio de trabajo</p>
        </div>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Selecciona una sala
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalaSelector value={salaId} onChange={setSalaId} />
          </CardContent>
        </Card>

        {salaId && (
          <div className="space-y-6 animate-fade-in">
            <AvailabilityCalendar salaId={salaId} />
            <BookingForm salaId={salaId} />
          </div>
        )}
      </main>
    </div>
  );
}

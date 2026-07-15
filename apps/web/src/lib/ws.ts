import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Crea una nueva conexión Socket.IO al namespace /bookings.
 * Cada llamada crea una instancia independiente (no singleton) — el componente
 * que la crea es responsable de llamar socket.disconnect() al desmontar (D6).
 */
export function createBookingsSocket(token: string): Socket {
  return io(`${API_URL}/bookings`, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
}

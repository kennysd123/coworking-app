import { BookingsGateway } from './bookings.gateway';
import { WsJwtGuard, WsJwtPayload } from './ws-jwt.guard';
import type { Server } from 'socket.io';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGuard(payload?: WsJwtPayload): jest.Mocked<WsJwtGuard> {
  return {
    verifyToken: payload
      ? jest.fn().mockReturnValue(payload)
      : jest.fn().mockImplementation(() => { throw new Error('jwt invalid'); }),
  } as unknown as jest.Mocked<WsJwtGuard>;
}

const validPayload: WsJwtPayload = {
  sub: 'user-id',
  email: 'test@test.com',
  role: 'regular',
  nombre: 'Test',
};

/**
 * Crea un servidor mock y extrae el middleware registrado por afterInit.
 */
function captureMiddleware(gateway: BookingsGateway): (
  socket: Record<string, unknown>,
  next: (err?: Error) => void,
) => void {
  let middleware!: (socket: Record<string, unknown>, next: (err?: Error) => void) => void;
  const mockServer = {
    use: jest.fn().mockImplementation((fn: typeof middleware) => { middleware = fn; }),
    to: jest.fn(),
    emit: jest.fn(),
  } as unknown as Server;
  gateway.afterInit(mockServer);
  return middleware;
}

// ── Tests del middleware de afterInit (tarea 7.4) ─────────────────────────────

describe('BookingsGateway - middleware de autenticación (afterInit)', () => {
  it('acepta la conexión cuando el token es válido y puebla socket.data.user', () => {
    const guard = makeGuard(validPayload);
    const gateway = new BookingsGateway(guard);
    const middleware = captureMiddleware(gateway);

    const next = jest.fn();
    const socket = { handshake: { auth: { token: 'valid.jwt' } }, data: {} as Record<string, unknown> };

    middleware(socket as unknown as Record<string, unknown>, next);

    expect(next).toHaveBeenCalledWith();          // sin error
    expect(next).toHaveBeenCalledTimes(1);
    expect(socket.data.user).toEqual(validPayload);
  });

  it('rechaza la conexión cuando el token está ausente', () => {
    const guard = makeGuard(validPayload);
    const gateway = new BookingsGateway(guard);
    const middleware = captureMiddleware(gateway);

    const next = jest.fn();
    const socket = { handshake: { auth: {} }, data: {} };

    middleware(socket as unknown as Record<string, unknown>, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((next.mock.calls[0][0] as Error).message).toMatch(/Unauthorized/i);
    expect(guard.verifyToken).not.toHaveBeenCalled();
  });

  it('rechaza la conexión cuando el token es inválido o expirado', () => {
    const guard = makeGuard(); // verifyToken lanza
    const gateway = new BookingsGateway(guard);
    const middleware = captureMiddleware(gateway);

    const next = jest.fn();
    const socket = { handshake: { auth: { token: 'expired.token' } }, data: {} };

    middleware(socket as unknown as Record<string, unknown>, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((next.mock.calls[0][0] as Error).message).toMatch(/Unauthorized/i);
  });
});

// ── Tests de WsJwtGuard.verifyToken (tarea 7.4c) ──────────────────────────────

describe('WsJwtGuard.verifyToken', () => {
  it('lanza cuando el JwtService.verify lanza (token malformado)', () => {
    const mockJwtService = { verify: jest.fn().mockImplementation(() => { throw new Error('jwt malformed'); }) };
    const guard = new WsJwtGuard(mockJwtService as never);

    expect(() => guard.verifyToken('bad.token')).toThrow('jwt malformed');
  });

  it('retorna el payload cuando el token es válido', () => {
    const mockJwtService = { verify: jest.fn().mockReturnValue(validPayload) };
    const guard = new WsJwtGuard(mockJwtService as never);

    expect(guard.verifyToken('good.token')).toEqual(validPayload);
  });
});

// ── Tests del gateway (tarea 7.3) ────────────────────────────────────────────

describe('BookingsGateway - eventos', () => {
  let gateway: BookingsGateway;
  let mockServer: jest.Mocked<Partial<Server>>;
  let mockRoom: { emit: jest.Mock };

  beforeEach(() => {
    gateway = new BookingsGateway(makeGuard(validPayload));
    mockRoom = { emit: jest.fn() };
    mockServer = {
      to: jest.fn().mockReturnValue(mockRoom),
    };
    // Simular que afterInit ya fue llamado (server inicializado)
    (gateway as unknown as { server: unknown }).server = mockServer;
  });

  it('subscribe-sala une al cliente al room del salaId (y deja rooms anteriores, excepto el propio)', () => {
    // rooms incluye el room propio (socket-id) + un room anterior (sala-prev)
    const mockClient = {
      join: jest.fn(),
      leave: jest.fn(),
      id: 'socket-id',
      rooms: new Set(['socket-id', 'sala-prev']),
    } as unknown as import('socket.io').Socket;

    gateway.handleSubscribeSala(mockClient, { salaId: 'sala-abc' });

    // Debe dejar 'sala-prev' pero NO 'socket-id' (room propio)
    expect(mockClient.leave).toHaveBeenCalledWith('sala-prev');
    expect(mockClient.leave).not.toHaveBeenCalledWith('socket-id');
    expect(mockClient.join).toHaveBeenCalledWith('sala-abc');
  });

  it('publishBookingCreated emite al room del salaId con payload correcto', () => {
    const event = {
      salaId: 'sala-abc',
      inicio: new Date('2024-06-01T10:00:00Z'),
      fin:   new Date('2024-06-01T12:00:00Z'),
    };

    gateway.publishBookingCreated(event);

    expect(mockServer.to).toHaveBeenCalledWith('sala-abc');
    expect(mockRoom.emit).toHaveBeenCalledWith('booking.created', {
      salaId: event.salaId,
      inicio: event.inicio,
      fin:    event.fin,
    });
  });

  it('publishBookingCancelled emite al room del salaId con payload correcto', () => {
    const event = { salaId: 'sala-abc', bookingId: 'booking-xyz' };

    gateway.publishBookingCancelled(event);

    expect(mockServer.to).toHaveBeenCalledWith('sala-abc');
    expect(mockRoom.emit).toHaveBeenCalledWith('booking.cancelled', {
      salaId:    event.salaId,
      bookingId: event.bookingId,
    });
  });

  it('publishBookingCreated no lanza si server aún no está inicializado', () => {
    (gateway as unknown as { server: unknown }).server = undefined;
    expect(() =>
      gateway.publishBookingCreated({ salaId: 's', inicio: new Date(), fin: new Date() }),
    ).not.toThrow();
  });
});

import { Body, Controller, Get, HttpCode, Post, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateBookingUseCase } from '../../application/use-cases/create-booking.use-case';
import { GetAvailabilityUseCase } from '../../application/use-cases/get-availability.use-case';
import { GetMyBookingsUseCase } from '../../application/use-cases/get-my-bookings.use-case';
import { GetAllBookingsUseCase } from '../../application/use-cases/get-all-bookings.use-case';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { Roles } from '../../../auth/infrastructure/http/decorators/roles.decorator';
import type { UserRole } from '../../../users/domain/entities/user.entity';

interface AuthenticatedUser {
  id: string;
  role: string;
}

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getAvailabilityUseCase: GetAvailabilityUseCase,
    private readonly getMyBookingsUseCase: GetMyBookingsUseCase,
    private readonly getAllBookingsUseCase: GetAllBookingsUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear una reserva (userId y userRole extraídos del JWT)' })
  @ApiResponse({ status: 201, description: '{ id }' })
  @ApiResponse({ status: 409, description: 'Overbooking — sala ya reservada en ese horario' })
  @ApiResponse({ status: 422, description: 'Límite transaccional excedido (simultáneas, mensual, duración, anticipación)' })
  async create(
    @Body() dto: CreateBookingDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<{ id: string }> {
    const booking = await this.createBookingUseCase.execute({
      salaId: dto.salaId,
      userId: req.user.id,
      userRole: req.user.role as UserRole,
      inicio: new Date(dto.inicio),
      fin: new Date(dto.fin),
    });
    return { id: booking.id };
  }

  @Get('availability')
  @ApiOperation({ summary: 'Consultar slots ocupados de una sala en un rango de fechas' })
  @ApiResponse({ status: 200, description: '{ salaId, slots: [{ inicio, fin }] }' })
  async availability(@Query() query: AvailabilityQueryDto) {
    const slots = await this.getAvailabilityUseCase.execute({
      salaId: query.salaId,
      desde: new Date(query.desde),
      hasta: new Date(query.hasta),
    });
    return { salaId: query.salaId, slots };
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar reservas del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Array de reservas propias' })
  async myBookings(@Request() req: { user: AuthenticatedUser }) {
    const bookings = await this.getMyBookingsUseCase.execute(req.user.id);
    return bookings.map((b) => ({
      id: b.id,
      salaId: b.salaId,
      inicio: b.inicio,
      fin: b.fin,
      estado: b.estado,
    }));
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar todas las reservas del sistema (solo admin)' })
  @ApiResponse({ status: 200, description: 'Array de todas las reservas' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async allBookings() {
    const bookings = await this.getAllBookingsUseCase.execute();
    return bookings.map((b) => ({
      id: b.id,
      salaId: b.salaId,
      usuarioId: b.usuarioId,
      inicio: b.inicio,
      fin: b.fin,
      estado: b.estado,
    }));
  }
}


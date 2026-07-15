import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateSalaUseCase } from '../../application/use-cases/create-sala.use-case';
import { GetSalasUseCase } from '../../application/use-cases/get-salas.use-case';
import { UpdateSalaUseCase } from '../../application/use-cases/update-sala.use-case';
import { SalaNotFoundException } from '../../domain/exceptions/sala-not-found.exception';
import { Roles } from '../../../auth/infrastructure/http/decorators/roles.decorator';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateSalaDto } from './dto/update-sala.dto';

function toResponse(sala: { id: string; nombre: string; capacidad: number; ubicacion: string; activa: boolean }) {
  return { id: sala.id, nombre: sala.nombre, capacidad: sala.capacidad, ubicacion: sala.ubicacion, activa: sala.activa };
}

@ApiTags('salas')
@ApiBearerAuth('access-token')
@Controller('salas')
export class SalasController {
  constructor(
    private readonly createSalaUseCase: CreateSalaUseCase,
    private readonly getSalasUseCase: GetSalasUseCase,
    private readonly updateSalaUseCase: UpdateSalaUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @Roles('admin')
  @ApiOperation({ summary: 'Crear sala (solo admin)' })
  @ApiResponse({ status: 201, description: 'Sala creada' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  async create(@Body() dto: CreateSalaDto) {
    const sala = await this.createSalaUseCase.execute(dto);
    return toResponse(sala);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las salas (cualquier usuario autenticado)' })
  @ApiResponse({ status: 200, description: 'Array de salas' })
  async findAll() {
    const salas = await this.getSalasUseCase.execute();
    return salas.map(toResponse);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Editar sala (solo admin)' })
  @ApiResponse({ status: 200, description: 'Sala actualizada' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async update(@Param('id') id: string, @Body() dto: UpdateSalaDto) {
    try {
      const sala = await this.updateSalaUseCase.execute({ id, ...dto });
      return toResponse(sala);
    } catch (error) {
      if (error instanceof SalaNotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}

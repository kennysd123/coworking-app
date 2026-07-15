import { Body, Controller, Get, HttpCode, Post, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  nombre: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Registrar nuevo usuario (rol regular o premium)' })
  @ApiResponse({ status: 201, description: 'Usuario creado, sin campo password en respuesta' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o rol admin rechazado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.registerUserUseCase.execute({
      email: dto.email,
      password: dto.password,
      nombre: dto.nombre,
      role: dto.role,
    });
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión y obtener JWT' })
  @ApiResponse({ status: 200, description: 'access_token JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas (mensaje genérico)' })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute({ email: dto.email, password: dto.password });
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener datos del usuario autenticado desde el JWT' })
  @ApiResponse({ status: 200, description: '{ id, email, nombre, role }' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido' })
  me(@Request() req: { user: AuthenticatedUser }) {
    const { id, email, nombre, role } = req.user;
    return { id, email, nombre, role };
  }
}

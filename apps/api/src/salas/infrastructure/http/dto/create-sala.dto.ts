import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalaDto {
  @ApiProperty({ example: 'Sala Alfa' })
  @IsString()
  @MinLength(1)
  nombre!: string;

  @ApiProperty({ example: 10, description: 'Capacidad máxima de personas' })
  @IsInt()
  @Min(1)
  capacidad!: number;

  @ApiProperty({ example: 'Piso 2, Ala Norte' })
  @IsString()
  @MinLength(1)
  ubicacion!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}

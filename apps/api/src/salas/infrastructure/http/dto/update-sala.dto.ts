import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSalaDto {
  @ApiPropertyOptional({ example: 'Sala Alfa Renovada' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacidad?: number;

  @ApiPropertyOptional({ example: 'Piso 3, Ala Sur' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  ubicacion?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}

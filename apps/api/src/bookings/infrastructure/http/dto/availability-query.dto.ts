import { IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({ example: '11111111-1111-4111-a111-111111111111' })
  @IsUUID()
  salaId!: string;

  @ApiProperty({ example: '2024-06-15T00:00:00Z', description: 'Inicio del rango (ISO 8601)' })
  @IsDateString()
  desde!: string;

  @ApiProperty({ example: '2024-06-16T00:00:00Z', description: 'Fin del rango (ISO 8601)' })
  @IsDateString()
  hasta!: string;
}

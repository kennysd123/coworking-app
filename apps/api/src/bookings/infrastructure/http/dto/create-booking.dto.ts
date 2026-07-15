import { IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: '11111111-1111-4111-a111-111111111111', description: 'UUID de la sala a reservar' })
  @IsUUID()
  salaId!: string;

  // userId y userRole ya NO se envían en el body: se extraen del JWT (request.user)

  @ApiProperty({ example: '2024-06-15T10:00:00Z', description: 'Fecha/hora de inicio (ISO 8601)' })
  @IsDateString()
  inicio!: string;

  @ApiProperty({ example: '2024-06-15T12:00:00Z', description: 'Fecha/hora de fin (ISO 8601)' })
  @IsDateString()
  fin!: string;
}


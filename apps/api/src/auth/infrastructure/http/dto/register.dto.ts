import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Segura1!', description: 'Mín. 8 chars, 1 mayúsc., 1 núm.' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @MinLength(1)
  nombre!: string;

  @ApiProperty({ enum: ['regular', 'premium'], example: 'regular' })
  @IsIn(['regular', 'premium'], { message: 'role debe ser "regular" o "premium"' })
  role!: 'regular' | 'premium';
}

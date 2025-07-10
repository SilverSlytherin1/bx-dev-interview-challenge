import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  @Expose()
  email: string;

  @IsString()
  @MinLength(6)
  @Expose()
  password: string;

  @IsOptional()
  @IsString()
  @Expose()
  firstName?: string;

  @IsOptional()
  @IsString()
  @Expose()
  lastName?: string;
}

export class LoginDto {
  @IsEmail()
  @Expose()
  email: string;

  @IsString()
  @Expose()
  password: string;
}

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName?: string;

  @Expose()
  lastName?: string;

  @Expose()
  createdAt: Date;
}

export class AuthResponseDto {
  @Expose()
  user: UserDto;

  @Expose()
  accessToken: string;
}

import { IsEmail, IsNotEmpty, IsNumber, MinLength } from 'class-validator';

export class RegisterDto {
    @IsNotEmpty()
    name!: string;

    @IsEmail()
    email!: string;

    @MinLength(6)
    password!: string;

    @IsNumber()
    lat!: number;

    @IsNumber()
    lng!: number;
}
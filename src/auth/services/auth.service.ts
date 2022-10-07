import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignUpCredentialsDto } from '../dto/signup-credentials';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  signup(credentials: SignUpCredentialsDto) {
    console.log('entre aqui');
    const response = this.jwtService.sign(credentials);
    console.log('response|signup', response);
  }
}
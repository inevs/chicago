import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './decorators/current-user.decorator';

type UserWithoutPassword = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = user;
    return result;
  }

  async login(user: UserWithoutPassword) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Self-registration is disabled by default because the application runs in
   * single-user mode: data is not scoped per user, so every registered account
   * can access all data. The initial user is created by the database seed.
   * Set ALLOW_REGISTRATION=true to enable the endpoint (e.g. for local setups).
   */
  isRegistrationEnabled(): boolean {
    return process.env['ALLOW_REGISTRATION']?.trim().toLowerCase() === 'true';
  }

  async register(registerDto: RegisterDto) {
    if (!this.isRegistrationEnabled()) {
      throw new ForbiddenException('Registration is disabled');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = user;
    return this.login(result);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

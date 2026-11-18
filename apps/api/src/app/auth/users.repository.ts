import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { User } from '../../../generated/prisma/client';

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export type UserProfile = Pick<User, 'id' | 'email' | 'name' | 'createdAt'>;

/**
 * Data access for users. Encapsulates all Prisma queries on the `users`
 * table so that services do not depend on the ORM directly.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The user including the password hash, or null. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /** The public profile of the user (without password hash), or null. */
  findProfileById(id: string): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }
}

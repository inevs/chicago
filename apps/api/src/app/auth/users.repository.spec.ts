import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../../prisma.service';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const user = {
    id: '1',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should look up the user (including password hash) by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when the user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findProfileById', () => {
    it('should select only the public profile fields', async () => {
      const profile = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: user.createdAt,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(profile);

      const result = await repository.findProfileById('1');

      expect(result).toEqual(profile);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
    });

    it('should return null when the user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findProfileById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create the user with the given data', async () => {
      const data = {
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
      };
      mockPrismaService.user.create.mockResolvedValue(user);

      const result = await repository.create(data);

      expect(result).toEqual(user);
      expect(prisma.user.create).toHaveBeenCalledWith({ data });
    });
  });
});

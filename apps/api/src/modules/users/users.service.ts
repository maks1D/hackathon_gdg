import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePersonDto, UpdatePersonDto } from './dto/person.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { subscriptions: true },
      }),
      this.prisma.person.count(),
    ]);

    return {
      items: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: { subscriptions: true, usageRecords: true },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return person;
  }

  async create(dto: CreatePersonDto) {
    this.logger.log(`Creating person: ${dto.email}`);
    return this.prisma.person.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role || 'USER',
        subscriptionTier: dto.subscriptionTier || 'FREE',
      },
    });
  }

  async update(id: string, dto: UpdatePersonDto) {
    await this.findOne(id); // Throws if not found
    return this.prisma.person.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Throws if not found
    return this.prisma.person.delete({ where: { id } });
  }
}

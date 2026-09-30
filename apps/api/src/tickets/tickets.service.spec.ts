import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority } from '@ai-support/types';
import { NotFoundException } from '@nestjs/common';

describe('TicketsService (Multi-tenant Isolation)', () => {
  let service: TicketsService;

  const mockPrisma = {
    ticket: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
    },
    ticketComment: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should find ticket filtered by organizationId', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        title: 'Printer broken',
        organizationId: 'org-1',
        status: TicketStatus.OPEN,
      });

      const res = await service.findOne('ticket-1', 'org-1');
      expect(res.id).toBe('ticket-1');
      expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith({
        where: { id: 'ticket-1', organizationId: 'org-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if ticket belongs to another organization (prevent IDOR)', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(service.findOne('ticket-1', 'org-2')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith({
        where: { id: 'ticket-1', organizationId: 'org-2' },
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update ticket when organization matches', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        organizationId: 'org-1',
      });
      mockPrisma.ticket.update.mockResolvedValue({
        id: 'ticket-1',
        status: TicketStatus.RESOLVED,
      });

      const res = await service.update('ticket-1', { status: TicketStatus.RESOLVED }, 'org-1');
      expect(res.status).toBe(TicketStatus.RESOLVED);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-1' },
          data: { status: TicketStatus.RESOLVED },
        }),
      );
    });

    it('should reject update if ticket belongs to another organization', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(
        service.update('ticket-1', { status: TicketStatus.RESOLVED }, 'attacker-org'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should add comment when organization matches', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        organizationId: 'org-1',
      });
      mockPrisma.ticketComment.create.mockResolvedValue({
        id: 'c1',
        content: 'Investigating now',
      });

      const res = await service.addComment('ticket-1', 'user-1', { content: 'Investigating now' }, 'org-1');
      expect(res.id).toBe('c1');
    });

    it('should reject comment if ticket belongs to another organization', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(
        service.addComment('ticket-1', 'user-1', { content: 'Hack attempt' }, 'attacker-org'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.ticketComment.create).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from './schemas/activity-log.schema';
import { User } from '../users/data/user.schema';
import { ListActivityLogsQueryDto } from './dto/list-activity-logs-query.dto';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;

  const mockFindChain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockCountChain = {
    exec: jest.fn(),
  };

  const mockModel = {
    create: jest.fn(),
    find: jest.fn(() => mockFindChain),
    countDocuments: jest.fn(() => mockCountChain),
  };

  const mockUserModel = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        { provide: getModelToken(ActivityLog.name), useValue: mockModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get(ActivityLogsService);
  });

  describe('redactMetadata', () => {
    it('redacts sensitive keys recursively, case-insensitive', () => {
      const out = service.redactMetadata({
        Password: 'p',
        nested: { Token: 't', ok: 1 },
        list: [{ secret: 's' }, { fine: 'x' }],
      });
      expect(out).toEqual({
        Password: '[REDACTED]',
        nested: { Token: '[REDACTED]', ok: 1 },
        list: [{ secret: '[REDACTED]' }, { fine: 'x' }],
      });
    });
  });

  describe('create', () => {
    it('redacts metadata before persisting', async () => {
      mockModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
      await service.create({
        eventType: 'auth.login',
        summary: 'login',
        metadata: { password: 'pw', extra: 1 },
      });
      const saved = mockModel.create.mock.calls[0][0];
      expect(saved.metadata).toEqual({ password: '[REDACTED]', extra: 1 });
    });

    it('coerces actorUserId string to ObjectId', async () => {
      mockModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
      const id = new Types.ObjectId().toHexString();
      await service.create({ eventType: 'x', summary: 's', actorUserId: id });
      const saved = mockModel.create.mock.calls[0][0];
      expect(saved.actorUserId).toBeInstanceOf(Types.ObjectId);
      expect((saved.actorUserId as Types.ObjectId).toHexString()).toBe(id);
    });
  });

  describe('findPaginated', () => {
    const idA = new Types.ObjectId();
    const idB = new Types.ObjectId();
    const docs = [
      {
        _id: idA,
        eventType: 'auth.login',
        actorUserId: new Types.ObjectId(),
        actorRole: 'Admin',
        summary: 'admin logged in',
        metadata: { token: 'leak', other: 'ok' },
        timestamp: new Date('2026-01-02T00:00:00Z'),
      },
      {
        _id: idB,
        eventType: 'submission.created',
        summary: 'submitted',
        timestamp: new Date('2026-01-01T00:00:00Z'),
      },
    ];

    beforeEach(() => {
      mockFindChain.exec.mockResolvedValue(docs);
      mockCountChain.exec.mockResolvedValue(42);
    });

    it('paginates with deterministic sort and returns total', async () => {
      const result = await service.findPaginated({
        page: 2,
        limit: 10,
      } as ListActivityLogsQueryDto);

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(mockFindChain.sort).toHaveBeenCalledWith({
        timestamp: -1,
        _id: -1,
      });
      expect(mockFindChain.skip).toHaveBeenCalledWith(10);
      expect(mockFindChain.limit).toHaveBeenCalledWith(10);
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(idA.toHexString());
      // Defensive redaction on read
      expect(result.data[0].metadata).toEqual({
        token: '[REDACTED]',
        other: 'ok',
      });
    });

    it('combines filters: eventType, actorUserId, date range, search', async () => {
      const actor = new Types.ObjectId().toHexString();
      await service.findPaginated({
        page: 1,
        limit: 20,
        eventType: 'auth.login',
        actorUserId: actor,
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-31T00:00:00Z',
        search: 'log.in*', // regex chars must be escaped
      } as ListActivityLogsQueryDto);

      const filter = mockModel.find.mock.calls.at(-1)![0];
      expect(filter.eventType).toBe('auth.login');
      expect(filter.actorUserId).toBeInstanceOf(Types.ObjectId);
      expect(filter.timestamp.$gte).toBeInstanceOf(Date);
      expect(filter.timestamp.$lte).toBeInstanceOf(Date);
      expect(filter.summary.$options).toBe('i');
      expect(filter.summary.$regex).toBe('log\\.in\\*');
    });

    it('throws BadRequestException when from > to', async () => {
      await expect(
        service.findPaginated({
          page: 1,
          limit: 20,
          from: '2026-02-01T00:00:00Z',
          to: '2026-01-01T00:00:00Z',
        } as ListActivityLogsQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

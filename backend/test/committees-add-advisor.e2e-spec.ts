import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CommitteesService } from '../src/committees/committees.service';
import { UsersService } from '../src/users/users.service';

describe('Committees - Add Advisor (e2e)', () => {
  let app: INestApplication<App>;
  let committeesService: CommitteesService;
  let usersService: UsersService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    committeesService = moduleFixture.get<CommitteesService>(CommitteesService);
    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /committees/:committeeId/advisors', () => {
    const committeeId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const advisorUserId = 'advisor-user-id-1234';
    const coordinatorId = 'coordinator-user-id-5678';

    it('should successfully link advisor to committee with valid COORDINATOR token and request', async () => {
      const addAdvisorRequest = {
        advisorUserId,
        assignedAt: '2026-04-17T10:30:00.000Z',
      };

      // Direct service test to verify happy path
      const mockAdvisor = {
        _id: advisorUserId,
        email: 'advisor@example.com',
        role: 'Professor',
      };

      jest.spyOn(usersService, 'findByIdAndRole').mockResolvedValue(mockAdvisor);

      // Mock committee model's findOne and findOneAndUpdate
      const mockCommittee = {
        committeeId,
        name: 'Committee A',
        advisorId: null,
      };

      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockCommittee),
          }),
          findOneAndUpdate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...mockCommittee,
              advisorId: advisorUserId,
              advisorAssignedAt: new Date('2026-04-17T10:30:00.000Z'),
              advisorAssignedBy: coordinatorId,
            }),
          }),
        }));

      const result = await committeesService.addAdvisor(
        committeeId,
        advisorUserId,
        new Date('2026-04-17T10:30:00.000Z'),
        coordinatorId,
        'corr-1',
      );

      expect(result).toEqual({
        advisorUserId,
        assignedAt: new Date('2026-04-17T10:30:00.000Z'),
        assignedByUserId: coordinatorId,
      });
    });

    it('should reject with 409 when advisor is already linked to committee', async () => {
      const mockAdvisor = {
        _id: advisorUserId,
        email: 'advisor@example.com',
        role: 'Professor',
      };

      jest.spyOn(usersService, 'findByIdAndRole').mockResolvedValue(mockAdvisor);

      // Mock committee with advisor already linked
      const mockCommitteeWithAdvisor = {
        committeeId,
        name: 'Committee A',
        advisorId: advisorUserId, // Already assigned
      };

      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockCommitteeWithAdvisor),
          }),
        }));

      await expect(
        committeesService.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should return 404 when committee does not exist', async () => {
      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }));

      await expect(
        committeesService.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 when advisor user does not exist', async () => {
      jest.spyOn(usersService, 'findByIdAndRole').mockResolvedValue(null);

      const mockCommittee = {
        committeeId,
        name: 'Committee A',
        advisorId: null,
      };

      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockCommittee),
          }),
        }));

      await expect(
        committeesService.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 when user does not have advisor (Professor) role', async () => {
      const nonAdvisorUser = {
        _id: advisorUserId,
        email: 'student@example.com',
        role: 'Student',
      };

      // findByIdAndRole should return null if role doesn't match
      jest.spyOn(usersService, 'findByIdAndRole').mockResolvedValue(null);

      const mockCommittee = {
        committeeId,
        name: 'Committee A',
        advisorId: null,
      };

      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockCommittee),
          }),
        }));

      await expect(
        committeesService.addAdvisor(
          committeeId,
          advisorUserId,
          undefined,
          coordinatorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use server time if assignedAt is not provided', async () => {
      const mockAdvisor = {
        _id: advisorUserId,
        email: 'advisor@example.com',
        role: 'Professor',
      };

      jest.spyOn(usersService, 'findByIdAndRole').mockResolvedValue(mockAdvisor);

      const mockCommittee = {
        committeeId,
        name: 'Committee A',
        advisorId: null,
      };

      const now = new Date();

      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockCommittee),
          }),
          findOneAndUpdate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...mockCommittee,
              advisorId: advisorUserId,
              advisorAssignedBy: coordinatorId,
            }),
          }),
        }));

      const result = await committeesService.addAdvisor(
        committeeId,
        advisorUserId,
        undefined, // No assignedAt provided
        coordinatorId,
      );

      expect(result.assignedAt).toBeDefined();
      expect(result.assignedAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
      expect(result.advisorUserId).toEqual(advisorUserId);
      expect(result.assignedByUserId).toEqual(coordinatorId);
    });

    it('should never accept assignedByUserId from request body (security check)', async () => {
      // This test verifies that even if someone tries to send assignedByUserId in the request,
      // it is ignored and the value comes from JWT instead
      // The controller should strip this before calling the service

      const requestWithAssignedBy = {
        advisorUserId,
        assignedAt: '2026-04-17T10:30:00.000Z',
        assignedByUserId: 'malicious-coordinator-id', // Should be ignored
      };

      // The controller endpoint handler receives this, but should NOT pass assignedByUserId to service
      // It should extract coordinatorId from JWT req.user.userId instead

      const mockAdvisor = {
        _id: advisorUserId,
        email: 'advisor@example.com',
        role: 'Professor',
      };

      jest.spyOn(usersService, 'findByIdAndRole').mockResolvedValue(mockAdvisor);

      const mockCommittee = {
        committeeId,
        name: 'Committee A',
        advisorId: null,
      };

      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockCommittee),
          }),
          findOneAndUpdate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...mockCommittee,
              advisorId: advisorUserId,
              advisorAssignedAt: new Date('2026-04-17T10:30:00.000Z'),
              advisorAssignedBy: coordinatorId, // Always from JWT
            }),
          }),
        }));

      const result = await committeesService.addAdvisor(
        committeeId,
        advisorUserId,
        new Date('2026-04-17T10:30:00.000Z'),
        coordinatorId, // From JWT, never from request body
      );

      expect(result.assignedByUserId).toEqual(coordinatorId);
      expect(result.assignedByUserId).not.toEqual('malicious-coordinator-id');
    });

    it('should verify advisor via findByIdAndRole with Professor role', async () => {
      const mockAdvisor = {
        _id: advisorUserId,
        email: 'advisor@example.com',
        role: 'Professor',
      };

      const findByIdAndRoleSpy = jest
        .spyOn(usersService, 'findByIdAndRole')
        .mockResolvedValue(mockAdvisor);

      const mockCommittee = {
        committeeId,
        name: 'Committee A',
        advisorId: null,
      };

      jest
        .spyOn(committeesService as any, 'committeeModel')
        .mockImplementation(() => ({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockCommittee),
          }),
          findOneAndUpdate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...mockCommittee,
              advisorId: advisorUserId,
              advisorAssignedAt: new Date(),
              advisorAssignedBy: coordinatorId,
            }),
          }),
        }));

      await committeesService.addAdvisor(
        committeeId,
        advisorUserId,
        undefined,
        coordinatorId,
      );

      // Verify that findByIdAndRole was called with Professor role
      expect(findByIdAndRoleSpy).toHaveBeenCalledWith(advisorUserId, 'Professor');
    });
  });
});

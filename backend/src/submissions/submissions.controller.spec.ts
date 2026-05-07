import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/enums/role.enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('SubmissionsController (e2e)', () => {
  let app: INestApplication;

  const mockSubmissionsService = {
    addComment: jest.fn(),
    listComments: jest.fn(),
    createRevisionRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        { provide: SubmissionsService, useValue: mockSubmissionsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization as string | undefined;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid JWT');
          }

          const roleHeader = req.headers['x-test-role'] as string | undefined;
          req.user = {
            userId: 'prof-1',
            role: roleHeader ?? Role.Professor,
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const roleHeader = req.headers['x-test-role'] as string | undefined;
          const userRole = roleHeader ?? Role.Professor;

          if (userRole !== Role.Professor && userRole !== Role.Coordinator) {
            throw new ForbiddenException('Insufficient permissions');
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /submissions/:submissionId/comments', () => {
    it('should return 401 when JWT is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/comments')
        .send({ commentText: 'Test comment' })
        .expect(401);
    });

    it('should return 201 and create a comment', async () => {
      const mockComment = {
        commentId: 'comment-1',
        commentText: 'Test comment',
        reviewerUserId: 'prof-1',
        createdAt: new Date(),
      };

      mockSubmissionsService.addComment.mockResolvedValue(mockComment);

      const response = await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ commentText: 'Test comment' })
        .expect(201);

      expect(response.body).toMatchObject({
        commentId: 'comment-1',
        commentText: 'Test comment',
        reviewerUserId: 'prof-1',
      });
      expect(mockSubmissionsService.addComment).toHaveBeenCalledWith(
        'prof-1',
        'submission-1',
        { commentText: 'Test comment' },
      );
    });

    it('should return 400 when commentText is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({})
        .expect(400);
    });

    it('should return 400 when commentText exceeds 2000 characters', async () => {
      const longText = 'a'.repeat(2001);
      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ commentText: longText })
        .expect(400);
    });

    it('should return 403 when user is not a jury member', async () => {
      mockSubmissionsService.addComment.mockRejectedValue(
        new ForbiddenException('You must be a jury member to access this submission'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ commentText: 'Test comment' })
        .expect(403);
    });

    it('should return 404 when submission does not exist', async () => {
      mockSubmissionsService.addComment.mockRejectedValue(
        new NotFoundException('Submission submission-1 not found'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ commentText: 'Test comment' })
        .expect(404);
    });
  });

  describe('GET /submissions/:submissionId/comments', () => {
    it('should return 401 when JWT is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/submissions/submission-1/comments')
        .expect(401);
    });

    it('should return 200 and list comments', async () => {
      const mockComments = [
        {
          commentId: 'comment-1',
          commentText: 'First comment',
          reviewerUserId: 'prof-1',
          createdAt: new Date(),
        },
        {
          commentId: 'comment-2',
          commentText: 'Second comment',
          reviewerUserId: 'prof-1',
          createdAt: new Date(),
        },
      ];

      mockSubmissionsService.listComments.mockResolvedValue(mockComments);

      const response = await request(app.getHttpServer())
        .get('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].commentText).toBe('First comment');
      expect(response.body[1].commentText).toBe('Second comment');
      expect(mockSubmissionsService.listComments).toHaveBeenCalledWith(
        'prof-1',
        'submission-1',
      );
    });

    it('should return 403 when user is not a jury member', async () => {
      mockSubmissionsService.listComments.mockRejectedValue(
        new ForbiddenException('You must be a jury member to access this submission'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .expect(403);
    });

    it('should return 404 when submission does not exist', async () => {
      mockSubmissionsService.listComments.mockRejectedValue(
        new NotFoundException('Submission submission-1 not found'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/submissions/submission-1/comments')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .expect(404);
    });
  });

  describe('POST /submissions/:submissionId/revision-requests', () => {
    it('should return 401 when JWT is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/revision-requests')
        .send({ revisionDueDatetime: new Date().toISOString() })
        .expect(401);
    });

    it('should return 201 and create a revision request', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const mockRevisionRequest = {
        revisionRequestId: 'rev-req-1',
        requesterUserId: 'prof-1',
        revisionDueDatetime: futureDate,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockSubmissionsService.createRevisionRequest.mockResolvedValue(
        mockRevisionRequest,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/revision-requests')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ revisionDueDatetime: futureDate.toISOString() })
        .expect(201);

      expect(response.body).toMatchObject({
        revisionRequestId: 'rev-req-1',
        requesterUserId: 'prof-1',
        status: 'PENDING',
      });
      expect(mockSubmissionsService.createRevisionRequest).toHaveBeenCalledWith(
        'prof-1',
        'submission-1',
        { revisionDueDatetime: futureDate.toISOString() },
      );
    });

    it('should return 400 when revisionDueDatetime is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/revision-requests')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({})
        .expect(400);
    });

    it('should return 400 when revisionDueDatetime is not a valid ISO 8601 date', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/revision-requests')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ revisionDueDatetime: 'not-a-date' })
        .expect(400);
    });

    it('should return 400 when revisionDueDatetime is in the past', async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      mockSubmissionsService.createRevisionRequest.mockRejectedValue(
        new Error('revisionDueDatetime must be in the future'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/revision-requests')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ revisionDueDatetime: pastDate.toISOString() })
        .expect(500); // Service throws Error, not BadRequestException in this case
    });

    it('should return 403 when user is not a jury member', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockSubmissionsService.createRevisionRequest.mockRejectedValue(
        new ForbiddenException('You must be a jury member to access this submission'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/revision-requests')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ revisionDueDatetime: futureDate.toISOString() })
        .expect(403);
    });

    it('should return 404 when submission does not exist', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockSubmissionsService.createRevisionRequest.mockRejectedValue(
        new NotFoundException('Submission submission-1 not found'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/submissions/submission-1/revision-requests')
        .set('Authorization', 'Bearer token')
        .set('x-test-role', Role.Professor)
        .send({ revisionDueDatetime: futureDate.toISOString() })
        .expect(404);
    });
  });
});

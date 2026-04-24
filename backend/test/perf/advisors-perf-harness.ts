import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { AdvisorsController } from '../../src/advisors/advisors.controller';
import { AdvisorsService } from '../../src/advisors/advisors.service';
import { JwtStrategy } from '../../src/auth/jwt.strategy';
import { UsersService } from '../../src/users/users.service';

async function bootstrap(): Promise<void> {
  const secret = 'test-access-secret';

  const mockAdvisorsService = {
    listAdvisors: async () => ({
      data: [
        {
          advisorId: 'advisor-1',
          name: 'advisor@example.com',
          email: 'advisor@example.com',
          role: 'ADVISOR',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    }),
  };

  const usersById = new Map<string, { role: string }>([
    ['team-leader-id', { role: 'TEAM_LEADER' }],
    ['coordinator-id', { role: 'COORDINATOR' }],
    ['student-id', { role: 'STUDENT' }],
  ]);

  const mockUsersService = {
    findById: async (id: string) => usersById.get(id),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [AdvisorsController],
    providers: [
      {
        provide: AdvisorsService,
        useValue: mockAdvisorsService,
      },
      JwtStrategy,
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: () => secret,
        },
      },
      {
        provide: UsersService,
        useValue: mockUsersService,
      },
    ],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3101);

  console.log('Advisors perf harness listening on http://localhost:3101');
}

void bootstrap();

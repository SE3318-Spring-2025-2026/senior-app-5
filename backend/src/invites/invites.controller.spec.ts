import { Test, TestingModule } from '@nestjs/testing';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { Role } from '../auth/enums/role.enum';

describe('InvitesController - RBAC Matrix Validation', () => {
  let controller: InvitesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [
        { provide: InvitesService, useValue: {} },
      ],
    }).compile();

    controller = module.get<InvitesController>(InvitesController);
  });

  it('should restrict deliverInvites to Coordinator and Admin', () => {
    const roles = Reflect.getMetadata('roles', controller.deliverInvites);
    expect(roles).toEqual([Role.Coordinator, Role.Admin]);
  });
});
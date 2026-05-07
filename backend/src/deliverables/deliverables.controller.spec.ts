import { Test, TestingModule } from '@nestjs/testing';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';
import { Role } from '../auth/enums/role.enum';

describe('DeliverablesController', () => {
  let controller: DeliverablesController;
  let service: DeliverablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliverablesController],
      providers: [
        {
          provide: DeliverablesService,
          useValue: {
            listDeliverables: jest.fn(),
            createDeliverable: jest.fn(),
            updateDeliverable: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(DeliverablesController);
    service = module.get(DeliverablesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the expected roles metadata for listing', () => {
    const roles = Reflect.getMetadata('roles', controller.listDeliverables);
    expect(roles).toEqual(
      expect.arrayContaining([Role.Coordinator, Role.Professor, Role.Admin]),
    );
  });

  it('uses coordinator-only access for creation', () => {
    const roles = Reflect.getMetadata('roles', controller.createDeliverable);
    expect(roles).toEqual([Role.Coordinator]);
  });

  it('uses coordinator-only access for updates', () => {
    const roles = Reflect.getMetadata('roles', controller.updateDeliverable);
    expect(roles).toEqual([Role.Coordinator]);
  });

  it('passes actorId and correlationId to create service', async () => {
    jest.spyOn(service, 'createDeliverable').mockResolvedValue({
      deliverableId: '11111111-1111-4111-8111-111111111111',
      name: 'SoW',
      categoryWeight: 0.5,
      subWeight: 0.35,
      deliverablePercentage: 17.5,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });

    const req = {
      user: { userId: 'coord-1', role: Role.Coordinator },
      headers: { 'x-correlation-id': 'corr-1' },
    } as any;

    await controller.createDeliverable(
      {
        name: 'SoW',
        categoryWeight: 0.5,
        subWeight: 0.35,
        deliverablePercentage: 17.5,
      },
      req,
    );

    expect(service.createDeliverable).toHaveBeenCalledWith(
      {
        name: 'SoW',
        categoryWeight: 0.5,
        subWeight: 0.35,
        deliverablePercentage: 17.5,
      },
      'coord-1',
      'corr-1',
    );
  });

  it('passes correlationId to list service', async () => {
    jest.spyOn(service, 'listDeliverables').mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await controller.listDeliverables(
      { page: 1, limit: 20 },
      { headers: { 'x-correlation-id': 'corr-2' } } as any,
    );

    expect(service.listDeliverables).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      'corr-2',
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Role } from '../auth/enums/role.enum';

describe('AdminController - RBAC Matrix Validation', () => {
  let controller: AdminController;
  let adminService: { getActivityLogs: jest.Mock };

  beforeEach(async () => {
    adminService = { getActivityLogs: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should restrict moveStudentToGroup to Admin and Coordinator', () => {
    const roles = Reflect.getMetadata('roles', controller.moveStudentToGroup);
    expect(roles).toEqual([Role.Coordinator, Role.Admin]);
  });

  it('should restrict getAdvisorValidation to Admin and Coordinator', () => {
    const roles = Reflect.getMetadata('roles', controller.getAdvisorValidation);
    expect(roles).toEqual([Role.Coordinator, Role.Admin]);
  });

  it('should restrict executeSanitization to Admin and Coordinator', () => {
    const roles = Reflect.getMetadata('roles', controller.executeSanitization);
    expect(roles).toEqual([Role.Coordinator, Role.Admin]);
  });

  it('should restrict getActivityLogs to Admin and Coordinator', () => {
    const roles = Reflect.getMetadata('roles', controller.getActivityLogs);
    expect(roles).toEqual([Role.Coordinator, Role.Admin]);
  });

  it('getActivityLogs should delegate to AdminService with the parsed query', async () => {
    const expected = { data: [], page: 1, limit: 20, total: 0 };
    adminService.getActivityLogs.mockResolvedValue(expected);
    const query = { page: 1, limit: 20, eventType: 'auth.login' } as any;
    const result = await controller.getActivityLogs(query);
    expect(adminService.getActivityLogs).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });
});

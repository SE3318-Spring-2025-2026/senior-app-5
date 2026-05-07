import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Role } from '../auth/enums/role.enum'; 

describe('AdminController - RBAC Matrix Validation', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: {} },
      ],
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
});
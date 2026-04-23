import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { TransferAdvisorRequest } from './dto/transfer-advisor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @ApiOperation({ summary: 'Create a new group' })
  @ApiCreatedResponse({ description: 'Group created successfully' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @Get(':groupId/validate-statement-of-work')
  async validateSow(@Param('groupId') groupId: string) {
    return this.groupsService.validateStatementOfWork(groupId);
  }

  @Patch(':groupId/advisor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  async transferAdvisor(
    @Param('groupId') groupId: string,
    @Body() transferAdvisorRequest: TransferAdvisorRequest,
    @Req() req: any,
  ) {
    const coordinatorId = req.user.id;
    return this.groupsService.transferAdvisor(
      groupId,
      transferAdvisorRequest.currentAdvisorId,
      transferAdvisorRequest.newAdvisorId,
      coordinatorId,
    );
  }
}

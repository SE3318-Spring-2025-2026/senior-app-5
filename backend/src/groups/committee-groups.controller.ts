import { Body, Controller, Delete, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RemoveCommitteeGroupDto } from './dto/remove-committee-group.dto';
import { GroupsService } from './groups.service';

@ApiTags('Committee Groups')
@Controller('committees')
export class CommitteeGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove group from committee' })
  @ApiBody({ type: RemoveCommitteeGroupDto })
  @ApiNoContentResponse({ description: 'Group assignment removed' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  @Delete(':committeeId/groups')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroupFromCommittee(
    @Param('committeeId') committeeId: string,
    @Body() body: RemoveCommitteeGroupDto,
  ): Promise<void> {
    await this.groupsService.removeGroupFromCommittee(committeeId, body.groupId);
  }
}

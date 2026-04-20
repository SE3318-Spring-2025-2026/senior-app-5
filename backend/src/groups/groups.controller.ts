import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
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

  @ApiOperation({ summary: 'Add a member to a group (by groupId UUID)' })
  @ApiCreatedResponse({ description: 'Member added to group successfully' })
  @Post(':groupId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('groupId') groupId: string,
    @Body() body: AddMemberDto,
  ) {
    return this.groupsService.addMember(groupId, body.memberUserId);
  }

  @Get(':groupId/validate-statement-of-work')
  async validateSow(@Param('groupId') groupId: string) {
    return this.groupsService.validateStatementOfWork(groupId);
  }
}

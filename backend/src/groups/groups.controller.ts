import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AddGroupMemberDto } from './dto/add-group-member.dto';

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

  @ApiOperation({ summary: 'Add a member to an existing group' })
  @ApiBody({ type: AddGroupMemberDto })
  @ApiOkResponse({ description: 'Member added to group successfully' })
  @ApiNotFoundResponse({ description: 'Group or user not found' })
  @Post(':groupId/members')
  async addMember(
    @Param('groupId') groupId: string,
    @Body() body: AddGroupMemberDto,
  ) {
    return this.groupsService.addMemberToGroup(groupId, body.memberUserId);
  }

  @Get(':groupId/validate-statement-of-work')
  async validateSow(@Param('groupId') groupId: string) {
    return this.groupsService.validateStatementOfWork(groupId);
  }
}

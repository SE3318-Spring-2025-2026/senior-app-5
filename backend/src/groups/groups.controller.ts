import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
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
}

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }
}

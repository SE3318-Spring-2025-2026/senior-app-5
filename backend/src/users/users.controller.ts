import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Search users by a whitelisted field (email, role, _id). Returns matching users without password hash.',
  })
  @ApiQuery({ name: 'field', enum: ['email', 'role', '_id'], required: true })
  @ApiQuery({ name: 'value', type: String, required: true })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  async searchUsers(
    @Query('field') field: string,
    @Query('value') value: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.usersService.searchUsers(field, value, parsedLimit);
  }
}

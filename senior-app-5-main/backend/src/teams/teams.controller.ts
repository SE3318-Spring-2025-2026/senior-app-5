import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TeamsService } from './teams.service';
import { AddMemberDto } from './dto/add-member.dto';
import { TeamLeaderGuard } from './guards/team-leader.guard';

type JwtUser = { userId: string; email: string };
type RequestWithUser = Request & { user: JwtUser };

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post(':teamId/members')
  @UseGuards(AuthGuard('jwt'), TeamLeaderGuard)
  @HttpCode(HttpStatus.OK)
  async addMember(
    @Param('teamId') teamId: string,
    @Body() addMemberDto: AddMemberDto,
    @Req() req: RequestWithUser,
  ) {
    return this.teamsService.addMember(teamId, addMemberDto.userId);
  }
}

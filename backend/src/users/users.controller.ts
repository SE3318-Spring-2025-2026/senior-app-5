import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { LinkGithubDto } from './dto/link-github.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

interface JwtUser {
  userId: string;
  sub?: string;
  _id?: string;
  email: string;
  role: string;
}

interface RequestWithUser extends ExpressRequest {
  user: JwtUser;
}

interface GithubUserResponse {
  id: number;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary:
      'Search users by a whitelisted field (email, role, _id). Returns matching users without password hash.',
  })
  @ApiQuery({ name: 'field', enum: ['email', 'role', '_id'], required: true })
  @ApiQuery({ name: 'value', type: String, required: true })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @Get('search')
  async searchUsers(
    @Query('field') field: string,
    @Query('value') value: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.usersService.searchUsers(field, value, parsedLimit);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Link authenticated user account to GitHub' })
  @UseGuards(AuthGuard('jwt'))
  @Post(':userId/integrations/github')
  async linkGithub(
    @Param('userId') userId: string,
    @Request() req: RequestWithUser,
    @Body() body: LinkGithubDto,
  ) {
    const tokenUserId = req.user.userId || req.user.sub || req.user._id;
    if (tokenUserId !== userId) {
      throw new ForbiddenException(
        "You are not allowed to update this user's integrations.",
      );
    }

    if (!body.oauthAccessToken) {
      throw new UnauthorizedException('GitHub oauthAccessToken is required.');
    }

    try {
      const githubResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${body.oauthAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!githubResponse.ok) {
        throw new UnauthorizedException('Invalid GitHub access token.');
      }

      const githubUserData =
        (await githubResponse.json()) as GithubUserResponse;

      const githubAccountId = githubUserData.id.toString();

      await this.usersService.linkGithubAccount(userId, githubAccountId);

      return {
        success: true,
        message: 'GitHub credentials securely processed and stored.',
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException(
        'Failed to validate token with GitHub API.',
      );
    }
  }
}

import { 
  Controller, 
  Post, 
  Param, 
  Body, 
  UseGuards, 
  Request, 
  ForbiddenException, 
  UnauthorizedException 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  
  @UseGuards(AuthGuard('jwt')) 
  @Post(':userId/integrations/github')
  async linkGithub(
    @Param('userId') userId: string,
    @Request() req: any,
    @Body('oauthAccessToken') oauthAccessToken: string,
  ) {
    
    const tokenUserId = req.user.userId || req.user.sub || req.user._id;
    if (tokenUserId !== userId) {
      throw new ForbiddenException('You are not allowed to update this user\'s integrations.');
    }

    if (!oauthAccessToken) {
      throw new UnauthorizedException('GitHub oauthAccessToken is required.');
    }

    try {
      const githubResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${oauthAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!githubResponse.ok) {
        throw new UnauthorizedException('Invalid GitHub access token.');
      }

      const githubUserData = await githubResponse.json();
      const githubAccountId = githubUserData.id.toString();

      await this.usersService.linkGithubAccount(userId, githubAccountId);

      return { 
        success: true, 
        message: 'GitHub credentials securely processed and stored.' 
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to validate token with GitHub API.');
    }
  }
}
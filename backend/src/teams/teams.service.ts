import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { Team, TeamDocument } from './schemas/team.schema';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
  ) {}

  async updateIntegrations(teamId: string, dto: UpdateIntegrationsDto) {
    
    const { 
      jiraProjectKey, 
      jiraDomain, 
      jiraEmail, 
      jiraApiToken, 
      githubRepositoryId 
    } = dto;

    try {
      await lastValueFrom(
        this.httpService.get(
          `https://api.github.com/repos/${githubRepositoryId}`,
          { timeout: 5000 }
        ),
      );
    } catch (error: any) {
      throw new HttpException(
        'Invalid or not found GitHub Repository ID.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const authToken = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
      
      await lastValueFrom(
        this.httpService.get(
          `https://${jiraDomain}/rest/api/3/project/${jiraProjectKey}`,
          {
            headers: {
              Authorization: `Basic ${authToken}`,
              Accept: 'application/json',
            },
            timeout: 5000,
          }
        ),
      );
    } catch (error: any) {
      const status = error.response?.status;
      let errorMessage = 'Invalid Jira Project Key or Domain.';
      
      if (status === 401 || status === 403) {
        errorMessage = 'Jira Authentication failed. Please check your Email and API Token.';
      }

      throw new HttpException(
        errorMessage,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let updatedTeam: TeamDocument | null;
    try {
      updatedTeam = await this.teamModel
        .findByIdAndUpdate(
          teamId,
          { 
            jiraProjectKey, 
            jiraDomain, 
            jiraEmail, 
            jiraApiToken, 
            githubRepositoryId 
          },
          { returnDocument: 'after' },
        )
        .exec();
    } catch (error: any) {
      throw new HttpException(
        'Database error. Team ID might be invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!updatedTeam) {
      throw new HttpException(
        'Team not found in the database.',
        HttpStatus.NOT_FOUND,
      );
    }
    
    
    const teamData = updatedTeam.toObject();
    delete teamData.jiraApiToken; 

    return {
      success: true,
      message: 'Integrations successfully verified and saved to database.',
      data: teamData,
    };
  }

  findById(id: string) {
    return this.teamModel.findById(id).exec();
  }
}
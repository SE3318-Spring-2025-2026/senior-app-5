import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { Team, TeamDocument } from './schemas/team.schema';

@Injectable()
export class TeamsService {
  constructor(
    private readonly httpService: HttpService,
    
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
  ) {}

  async updateIntegrations(teamId: string, jiraProjectKey: string, githubRepositoryId: string) {
    
    
    try {
      await lastValueFrom(
        this.httpService.get(`https://api.github.com/repos/${githubRepositoryId}`)
      );
    } catch (error) {
      throw new HttpException('Invalid or not found GitHub Repository ID.', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    
    try {
      const jiraDomain = 'your-project.atlassian.net'; 
      await lastValueFrom(
        this.httpService.get(`https://${jiraDomain}/rest/api/3/project/${jiraProjectKey}`)
      );
    } catch (error) {
      throw new HttpException('Invalid or not found Jira Project Key.', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    
    
    let updatedTeam;
    try {
      updatedTeam = await this.teamModel.findByIdAndUpdate(
        teamId,
        { jiraProjectKey, githubRepositoryId },
        { new: true } 
      );
    } catch (error) {
      
      throw new HttpException('Database error. Team ID might be invalid.', HttpStatus.BAD_REQUEST);
    }

    
    if (!updatedTeam) {
      throw new HttpException('Team not found in the database.', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Integrations successfully verified and saved to database.',
      data: updatedTeam
    };
  }
}
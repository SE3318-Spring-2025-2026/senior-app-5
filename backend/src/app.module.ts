import { InvitesModule } from './invites/invites.module';
import { StoryPointsModule } from './story-points/story-points.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { AdminModule } from './admin/admin.module';
import { GroupsModule } from './groups/groups.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdvisorsModule } from './advisors/advisors.module';
import { PhasesModule } from './phases/phases.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { CommitteesModule } from './committees/committees.module';
import { GradesModule } from './grades/grades.module';
import { SprintEvaluationsModule } from './sprint-evaluations/sprint-evaluations.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
    UsersModule,
    AuthModule,
    TeamsModule,
    AdminModule,
    GroupsModule,
    NotificationsModule,
    AdvisorsModule,
    PhasesModule,
    SubmissionsModule,
    CommitteesModule,
    InvitesModule,
    StoryPointsModule,
    GradesModule,
    SprintEvaluationsModule,
    DeliverablesModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

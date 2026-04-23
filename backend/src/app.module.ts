import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RootController } from './root.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { AdminModule } from './admin/admin.module';
import { GroupsModule } from './groups/groups.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PhasesModule } from './phases/phases.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { CommitteesModule } from './committees/committees.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { RubricsModule } from './rubrics/rubrics.module';

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
    PhasesModule,
    SubmissionsModule,
    CommitteesModule,
    DeliverablesModule,
    RubricsModule,
  ],
  controllers: [RootController, AppController],
  providers: [AppService],
})
export class AppModule {}

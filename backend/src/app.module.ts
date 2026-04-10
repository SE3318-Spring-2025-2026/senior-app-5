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
import { AdvisorsModule } from './advisors/advisors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
    UsersModule,
    AuthModule,
    TeamsModule,
    AdminModule,
    GroupsModule,
    AdvisorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

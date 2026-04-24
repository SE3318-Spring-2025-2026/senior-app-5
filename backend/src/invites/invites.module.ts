import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService], 
})
export class InvitesModule {}
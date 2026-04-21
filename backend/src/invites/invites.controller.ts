import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';


@ApiTags('Invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invites')
export class InvitesController {

  @Post('deliver')
  @Roles(Role.Coordinator) 
  @ApiOperation({ summary: 'Deliver invites to groups' })
  async deliverInvites() { ... }
}
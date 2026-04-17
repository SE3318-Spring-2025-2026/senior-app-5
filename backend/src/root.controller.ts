import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class RootController {
  @ApiOperation({ summary: 'Root health check - redirects to API docs' })
  @Get()
  root() {
    return {
      message: 'Senior App Backend',
      version: '1.0.0',
      status: 'running',
      docs: 'Visit http://localhost:3001/api/v1/docs for API documentation',
    };
  }
}

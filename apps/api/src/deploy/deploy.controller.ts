import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SafeUser } from '../auth/auth.types'
import { DeployService } from './deploy.service'

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  // POST /api/v1/projects/:id/deploy — 5 per minute per IP
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/deploy')
  @HttpCode(HttpStatus.OK)
  triggerDeploy(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.deployService.triggerDeploy(id, user.id)
  }

  // GET /api/v1/projects/:id/deploy — latest deployment
  @Get(':id/deploy')
  getLatestDeploy(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.deployService.getLatestDeploy(id, user.id)
  }

  // GET /api/v1/projects/:id/deploys — deployment history
  @Get(':id/deploys')
  getDeployHistory(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.deployService.getDeployHistory(id, user.id)
  }

  // POST /api/v1/projects/:id/stop — stop a live bot
  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stopBot(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.deployService.stopBot(id, user.id)
  }
}

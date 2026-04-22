import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SafeUser } from '../auth/auth.types'
import { GeneratorService } from './generator.service'

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  // POST /api/v1/projects/:id/generate — 10 per minute per IP
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/generate')
  @HttpCode(HttpStatus.OK)
  generate(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.generatorService.generate(id, user.id)
  }

  // GET /api/v1/projects/:id/generated
  @Get(':id/generated')
  async getGenerated(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    const summary = await this.generatorService.getGenerated(id, user.id)
    if (!summary) throw new NotFoundException('No generated version found for this project')
    return summary
  }

  // GET /api/v1/projects/:id/preview — preview generated files without persisting
  @Get(':id/preview')
  preview(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.generatorService.preview(id, user.id)
  }
}

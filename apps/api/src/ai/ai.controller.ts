import {
  Body,
  Controller,
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
import { AIService } from './ai.service'
import { ProjectsService } from '../projects/projects.service'

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly projectsService: ProjectsService,
  ) {}

  // POST /api/v1/ai/generate-config
  // Takes a prompt, returns template + config suggestion
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('generate-config')
  @HttpCode(HttpStatus.OK)
  generateConfig(@Body() body: { prompt: string }) {
    return this.aiService.generateConfigFromPrompt(body.prompt)
  }

  // POST /api/v1/ai/apply/:projectId
  // Takes AI result and applies it: assigns template + saves config
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('apply/:projectId')
  @HttpCode(HttpStatus.OK)
  async applyConfig(
    @Param('projectId') projectId: string,
    @Body() body: { templateKey: string; config: Record<string, unknown> },
    @CurrentUser() user: SafeUser,
  ) {
    // 1. Assign template
    await this.projectsService.assignTemplate(projectId, user.id, {
      templateKey: body.templateKey,
    })

    // 2. Save config
    await this.projectsService.saveConfig(projectId, user.id, {
      config: body.config,
    })

    return { applied: true }
  }
}

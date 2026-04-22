import { Controller, Get, Param } from '@nestjs/common'
import { TemplatesService } from './templates.service'

// No auth required — templates are public.
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // GET /api/v1/templates
  @Get()
  findAll() {
    return this.templatesService.listActive()
  }

  // GET /api/v1/templates/:key
  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.templatesService.findOne(key)
  }
}

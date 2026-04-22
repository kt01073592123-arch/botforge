import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SafeUser } from '../auth/auth.types'
import { ProjectsService } from './projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { AssignTemplateDto } from './dto/assign-template.dto'
import { SaveConfigDto } from './dto/save-config.dto'

// Every route in this controller requires a valid JWT cookie.
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // POST /api/v1/projects
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: SafeUser) {
    return this.projectsService.create(user.id, dto)
  }

  // GET /api/v1/projects
  @Get()
  findAll(@CurrentUser() user: SafeUser) {
    return this.projectsService.findAllByUser(user.id)
  }

  // GET /api/v1/projects/:id
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.projectsService.findOneByUser(id, user.id)
  }

  // GET /api/v1/projects/:id/overview
  // Aggregated dashboard state: project + config + generation + deployment + payment.
  @Get(':id/overview')
  getOverview(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.projectsService.getOverview(id, user.id)
  }

  // PATCH /api/v1/projects/:id — rename
  @Patch(':id')
  rename(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: SafeUser,
  ) {
    return this.projectsService.rename(id, user.id, body.name)
  }

  // DELETE /api/v1/projects/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.projectsService.remove(id, user.id)
  }

  // PATCH /api/v1/projects/:id/template
  @Patch(':id/template')
  assignTemplate(
    @Param('id') id: string,
    @Body() dto: AssignTemplateDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.projectsService.assignTemplate(id, user.id, dto)
  }

  // GET /api/v1/projects/:id/config
  @Get(':id/config')
  getConfig(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.projectsService.getConfig(id, user.id)
  }

  // PUT /api/v1/projects/:id/config
  @Put(':id/config')
  saveConfig(
    @Param('id') id: string,
    @Body() dto: SaveConfigDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.projectsService.saveConfig(id, user.id, dto)
  }
}

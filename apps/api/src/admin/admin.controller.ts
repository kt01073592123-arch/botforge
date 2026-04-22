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
import { AdminGuard } from '../auth/guards/admin.guard'
import { AdminService } from './admin.service'

// Both guards are required on every route in this controller.
// JwtAuthGuard: validates the JWT cookie → populates req.user (401 if missing/expired).
// AdminGuard:   checks req.user.role === 'ADMIN' (403 if regular user).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /api/v1/admin/users
  @Get('users')
  listUsers() {
    return this.adminService.listUsers()
  }

  // GET /api/v1/admin/projects
  @Get('projects')
  listProjects() {
    return this.adminService.listProjects()
  }

  // GET /api/v1/admin/payments
  @Get('payments')
  listPayments() {
    return this.adminService.listPayments()
  }

  // GET /api/v1/admin/deployments
  @Get('deployments')
  listDeployments() {
    return this.adminService.listDeployments()
  }

  // POST /api/v1/admin/projects/:id/redeploy
  // Bypasses payment gate — admin-only redeploy for any project.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('projects/:id/redeploy')
  @HttpCode(HttpStatus.OK)
  retriggerDeploy(@Param('id') id: string) {
    return this.adminService.retriggerDeploy(id)
  }

  // POST /api/v1/admin/maintenance/migrate-secrets
  // One-time migration: moves raw secret values from BotConfig → encrypted BotSecret.
  // Idempotent — safe to run multiple times.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('maintenance/migrate-secrets')
  @HttpCode(HttpStatus.OK)
  migrateSecrets() {
    return this.adminService.migrateSecretsToVault()
  }
}

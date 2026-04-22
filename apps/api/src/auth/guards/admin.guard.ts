import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { SafeUser } from '../auth.types'

/**
 * Guards admin endpoints. Must be applied AFTER JwtAuthGuard so that
 * req.user is already populated before this guard runs.
 *
 * Usage: @UseGuards(JwtAuthGuard, AdminGuard)
 *
 * Returns 403 Forbidden for authenticated non-admin users.
 * JwtAuthGuard handles the 401 case (no/invalid token).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: SafeUser }>()
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required')
    }
    return true
  }
}

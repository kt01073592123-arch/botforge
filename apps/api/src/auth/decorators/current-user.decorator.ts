import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { SafeUser } from '../auth.types'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user: SafeUser }>()
    return req.user
  },
)

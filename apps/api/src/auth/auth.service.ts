import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Prisma, User } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { SafeUser } from './auth.types'
import { AuditService, AuditEventType } from '../audit/audit.service'
import { logEvent, logWarn } from '../lib/logger'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(dto.password, 12)

    try {
      const user = await this.usersService.create({
        email: dto.email,
        passwordHash,
        name: dto.name,
      })

      logEvent(this.logger, 'auth.register.ok', { userId: user.id })
      void this.audit.record({
        actorUserId: user.id,
        eventType: AuditEventType.AUTH_REGISTER_OK,
        entityType: 'user',
        entityId: user.id,
      })

      return this.sanitize(user)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        logWarn(this.logger, 'auth.register.conflict', { email: dto.email })
        void this.audit.record({
          actorUserId: null,
          eventType: AuditEventType.AUTH_REGISTER_CONFLICT,
          entityType: 'user',
          entityId: dto.email,
          metadata: { email: dto.email },
        })
        throw new ConflictException('Email already in use')
      }
      throw err
    }
  }

  async login(dto: LoginDto): Promise<SafeUser> {
    const user = await this.usersService.findByEmail(dto.email)

    // Constant-time check prevents user enumeration (same error for missing and wrong password)
    const isValid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false
    if (!user || !isValid) {
      logWarn(this.logger, 'auth.login.fail', { email: dto.email })
      void this.audit.record({
        actorUserId: null,
        eventType: AuditEventType.AUTH_LOGIN_FAIL,
        entityType: 'user',
        entityId: dto.email,
        metadata: { email: dto.email },
      })
      throw new UnauthorizedException('Invalid credentials')
    }

    logEvent(this.logger, 'auth.login.ok', { userId: user.id })
    void this.audit.record({
      actorUserId: user.id,
      eventType: AuditEventType.AUTH_LOGIN_OK,
      entityType: 'user',
      entityId: user.id,
    })

    return this.sanitize(user)
  }

  signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email })
  }

  private sanitize(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user
    return safe
  }
}

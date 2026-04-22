import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { Response } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { SafeUser } from './auth.types'

const COOKIE_NAME = 'access_token'
const IS_PROD = process.env.NODE_ENV === 'production'

// Base options shared by Set-Cookie and clear-cookie.
// Keeping them consistent prevents browsers from ignoring the deletion.
const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax' as const,
  path: '/',
}

const COOKIE_SET_OPTIONS = {
  ...COOKIE_BASE,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}

// clearCookie ignores maxAge/expires from options and sets its own past date,
// but passing the same path/secure/sameSite ensures consistent browser handling.
const COOKIE_CLEAR_OPTIONS = COOKIE_BASE

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 5 registrations per minute per IP — prevent account-creation spam
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(dto)
    const token = this.authService.signToken(user.id, user.email)
    res.cookie(COOKIE_NAME, token, COOKIE_SET_OPTIONS)
    return { user }
  }

  // 10 login attempts per minute per IP — pairs with bcrypt to slow brute-force
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.login(dto)
    const token = this.authService.signToken(user.id, user.email)
    res.cookie(COOKIE_NAME, token, COOKIE_SET_OPTIONS)
    return { user }
  }

  @SkipThrottle()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTIONS)
    return { message: 'Logged out' }
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: SafeUser) {
    return user
  }
}

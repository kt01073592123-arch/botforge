import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import appConfig from './config/app.config'
import { PrismaModule } from './prisma/prisma.module'
import { AuditModule } from './audit/audit.module'
import { GlobalExceptionFilter } from './filters/http-exception.filter'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { ProjectsModule } from './projects/projects.module'
import { TemplatesModule } from './templates/templates.module'
import { GeneratorModule } from './generator/generator.module'
import { DeployModule } from './deploy/deploy.module'
import { PaymentsModule } from './payments/payments.module'
import { AdminModule } from './admin/admin.module'
import { AIModule } from './ai/ai.module'

@Module({
  imports: [
    // Config available everywhere via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
    }),

    // BullMQ global connection — modules register individual queues with BullModule.registerQueue()
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('app.redis.url', 'redis://localhost:6379')
        const parsed = new URL(redisUrl)
        return {
          connection: {
            host: parsed.hostname,
            port: parseInt(parsed.port || '6379', 10),
            password: parsed.password || undefined,
            // maxRetriesPerRequest: null is required by BullMQ
            maxRetriesPerRequest: null,
          },
        }
      },
    }),

    // Rate limiting — IP-based, applied globally (see ThrottlerGuard in providers).
    // Default: 100 req / 60 s per IP. Sensitive endpoints override with @Throttle().
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60_000, // ms
      limit: 100,
    }]),

    // Prisma client available everywhere (global module)
    PrismaModule,

    // Audit trail — global so AuditService can be injected anywhere
    AuditModule,

    // Feature modules
    HealthModule,
    AuthModule,
    ProjectsModule,
    TemplatesModule,
    GeneratorModule,
    DeployModule,
    PaymentsModule,
    AdminModule,
    AIModule,
  ],
  providers: [
    // Global exception filter — normalises all error responses (no stack traces to clients)
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Global rate-limit guard — all routes throttled; use @SkipThrottle() to exempt
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  // rawBody: true stores the raw request buffer on req.rawBody.
  // Required for Stripe webhook signature verification — Stripe signs the raw body,
  // so any JSON re-serialisation would invalidate the signature.
  const app = await NestFactory.create(AppModule, { rawBody: true })

  // Parse cookies — required for httpOnly JWT cookie auth
  app.use(cookieParser())

  // All routes are prefixed with /api
  app.setGlobalPrefix('api')

  // URI versioning: /api/v1/...
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  // Validate and strip unknown fields from request bodies
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  const port = process.env.PORT ?? 3001
  await app.listen(port)

  console.log(`[API] Running on http://localhost:${port}/api/v1`)
  console.log(`[API] Health check: http://localhost:${port}/api/v1/health`)
}

bootstrap()

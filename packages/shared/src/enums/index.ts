// Mirrors the Prisma enums so non-API code (worker, frontend) can import
// without depending on @prisma/client directly.

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  CONFIGURED = 'CONFIGURED',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  BUILDING = 'BUILDING',
  DEPLOYING = 'DEPLOYING',
  LIVE = 'LIVE',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum JobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

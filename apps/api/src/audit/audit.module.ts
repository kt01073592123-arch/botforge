import { Global, Module } from '@nestjs/common'
import { AuditService } from './audit.service'

// @Global so AuditService can be injected anywhere without importing AuditModule.
// PrismaModule is already global so no explicit import needed here.
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

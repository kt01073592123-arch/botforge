import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  // Export so GeneratorModule + DeployModule can inject PaymentsService
  exports: [PaymentsService],
})
export class PaymentsModule {}

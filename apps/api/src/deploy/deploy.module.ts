import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { DeployController } from './deploy.controller'
import { DeployService } from './deploy.service'
import { ProjectsModule } from '../projects/projects.module'
import { PaymentsModule } from '../payments/payments.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'bot-pipeline' }),
    ProjectsModule,   // ownership checks
    PaymentsModule,   // payment gate enforcement
  ],
  controllers: [DeployController],
  providers: [DeployService],
})
export class DeployModule {}

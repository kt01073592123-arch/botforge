import { Module } from '@nestjs/common'
import { GeneratorController } from './generator.controller'
import { GeneratorService } from './generator.service'
import { ProjectsModule } from '../projects/projects.module'
import { PaymentsModule } from '../payments/payments.module'

@Module({
  imports: [
    ProjectsModule,  // ownership checks
    PaymentsModule,  // payment gate enforcement
  ],
  controllers: [GeneratorController],
  providers: [GeneratorService],
})
export class GeneratorModule {}

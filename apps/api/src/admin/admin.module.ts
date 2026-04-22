import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [
    // Needed for the admin redeploy action
    BullModule.registerQueue({ name: 'bot-pipeline' }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

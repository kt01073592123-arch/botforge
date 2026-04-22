import { IsObject } from 'class-validator'

export class SaveConfigDto {
  @IsObject()
  config!: Record<string, unknown>
}

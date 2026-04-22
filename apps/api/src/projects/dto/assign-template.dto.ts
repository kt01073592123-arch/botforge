import { IsString, MaxLength, MinLength } from 'class-validator'

export class AssignTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  templateKey!: string
}

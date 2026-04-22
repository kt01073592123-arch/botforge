import { Transform } from 'class-transformer'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateProjectDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(1, { message: 'Project name cannot be empty' })
  @MaxLength(100, { message: 'Project name cannot exceed 100 characters' })
  name!: string
}

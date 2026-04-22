import { Injectable, NotFoundException } from '@nestjs/common'
import { getActiveTemplates, getTemplateDetail } from '@botforge/templates'

@Injectable()
export class TemplatesService {
  /** Returns metadata for all active templates. */
  listActive() {
    return getActiveTemplates()
  }

  /** Returns metadata + fields for a single template, or 404. */
  findOne(key: string) {
    const detail = getTemplateDetail(key)
    if (!detail) throw new NotFoundException(`Template "${key}" not found`)
    return detail
  }
}

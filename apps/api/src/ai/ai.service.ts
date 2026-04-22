import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getActiveTemplates, getTemplateDef } from '@botforge/templates'
import { logEvent, logError } from '../lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIConfigResult {
  templateKey: string
  templateName: string
  config: Record<string, unknown>
  explanation: string
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name)
  private readonly apiKey: string

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.geminiApiKey', '')
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set — AI bot creation will not work')
    }
  }

  async generateConfigFromPrompt(prompt: string): Promise<AIConfigResult> {
    if (!this.apiKey) {
      throw new BadRequestException('AI xizmati sozlanmagan (GEMINI_API_KEY)')
    }

    if (!prompt || prompt.trim().length < 10) {
      throw new BadRequestException("Kamida 10 ta belgi kiriting. Masalan: 'Picca restoran uchun buyurtma boti kerak'")
    }

    const templates = getActiveTemplates()
    const templateList = templates.map(t => `- ${t.key}: ${t.name} — ${t.description}`).join('\n')

    const templateDetails = templates.map(t => {
      const def = getTemplateDef(t.key)
      if (!def) return ''
      const fields = def.fields.map(f => {
        let info = `    - ${f.name} (${f.type}${f.required ? ', required' : ', optional'}): ${f.label}`
        if (f.defaultValue !== undefined) info += ` [default: ${JSON.stringify(f.defaultValue)}]`
        return info
      }).join('\n')
      return `  ${t.key}:\n${fields}`
    }).join('\n\n')

    const systemInstruction = `Sen BotForge platformasi uchun AI yordamchisan. Foydalanuvchi Telegram bot yaratmoqchi.
Uning tavsifiga qarab eng mos shablonni tanla va config to'ldir.

MAVJUD SHABLONLAR:
${templateList}

HAR BIR SHABLONNING MAYDONLARI:
${templateDetails}

MUHIM QOIDALAR:
1. botToken va ownerChatId DOIMO bo'sh qolsin — foydalanuvchi keyin o'zi kiritadi
2. Foydalanuvchi tilida javob ber (odatda o'zbek)
3. welcomeMessage va successMessage foydalanuvchi so'roviga mos bo'lsin
4. Agar foydalanuvchi mahsulotlar/xizmatlar ro'yxatini bersa, ularni config'ga qo'sh
5. catalog maydoni JSON string bo'lishi kerak: '[{"name":"...","price":...}]'
6. services va timeSlots maydoni JSON string bo'lishi kerak: '["...","..."]'
7. categories maydoni JSON string bo'lishi kerak: '["...","..."]'

JAVOB FORMATI — faqat JSON, boshqa hech narsa yozma:
{
  "templateKey": "tanlangan-shablon-key",
  "config": { ...maydonlar... },
  "explanation": "Qisqa tushuntirish nima qilganingiz haqida"
}`

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
          },
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        logError(this.logger, 'ai.api_error', { status: response.status }, err)
        throw new BadRequestException('AI xizmatida xatolik yuz berdi')
      }

      const data = await response.json() as {
        candidates: Array<{ content: { parts: Array<{ text: string }> } }>
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!content) {
        throw new BadRequestException('AI javob bermadi')
      }

      let parsed: { templateKey: string; config: Record<string, unknown>; explanation: string }

      try {
        parsed = JSON.parse(content)
      } catch {
        logError(this.logger, 'ai.parse_error', { content: content.slice(0, 200) })
        throw new BadRequestException("AI javobi noto'g'ri formatda")
      }

      // Validate template exists
      const templateDef = getTemplateDef(parsed.templateKey)
      if (!templateDef) {
        throw new BadRequestException(`AI tanlagan shablon topilmadi: ${parsed.templateKey}`)
      }

      // Ensure botToken and ownerChatId are empty
      parsed.config.botToken = ''
      parsed.config.ownerChatId = ''

      const templateMeta = templates.find(t => t.key === parsed.templateKey)

      logEvent(this.logger, 'ai.config_generated', {
        templateKey: parsed.templateKey,
        promptLength: prompt.length,
      })

      return {
        templateKey: parsed.templateKey,
        templateName: templateMeta?.name ?? parsed.templateKey,
        config: parsed.config,
        explanation: parsed.explanation,
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      logError(this.logger, 'ai.failed', {}, err)
      throw new BadRequestException('AI xizmatida xatolik: ' + (err instanceof Error ? err.message : String(err)))
    }
  }
}

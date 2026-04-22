import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { getActiveTemplates, getTemplateDef } from '@botforge/templates'
import { logEvent, logError } from '../lib/logger'

export interface AIConfigResult {
  templateKey: string
  templateName: string
  config: Record<string, unknown>
  explanation: string
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name)

  async generateConfigFromPrompt(
    prompt: string,
    aiProvider: 'openai' | 'gemini',
    aiApiKey: string,
  ): Promise<AIConfigResult> {
    if (!aiApiKey || aiApiKey.trim().length < 10) {
      throw new BadRequestException('AI API kalit kiritilmagan')
    }
    if (!prompt || prompt.trim().length < 10) {
      throw new BadRequestException("Kamida 10 ta belgi kiriting")
    }

    const systemPrompt = this.buildSystemPrompt()

    const content = aiProvider === 'openai'
      ? await this.callOpenAI(systemPrompt, prompt, aiApiKey)
      : await this.callGemini(systemPrompt, prompt, aiApiKey)

    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: { templateKey: string; config: Record<string, unknown>; explanation: string }

    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      logError(this.logger, 'ai.parse_error', { content: content.slice(0, 200) })
      throw new BadRequestException("AI javobi noto'g'ri formatda")
    }

    const templateDef = getTemplateDef(parsed.templateKey)
    if (!templateDef) {
      throw new BadRequestException(`Shablon topilmadi: ${parsed.templateKey}`)
    }

    parsed.config.botToken = ''
    parsed.config.ownerChatId = ''

    const templates = getActiveTemplates()
    const meta = templates.find(t => t.key === parsed.templateKey)

    logEvent(this.logger, 'ai.config_generated', { templateKey: parsed.templateKey })

    return {
      templateKey: parsed.templateKey,
      templateName: meta?.name ?? parsed.templateKey,
      config: parsed.config,
      explanation: parsed.explanation,
    }
  }

  private async callOpenAI(system: string, user: string, apiKey: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.3, max_tokens: 2000,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      logError(this.logger, 'ai.openai_error', { status: res.status }, err)
      throw new BadRequestException('OpenAI xatolik. Kalitni tekshiring.')
    }
    const data = await res.json() as any
    return data.choices?.[0]?.message?.content?.trim() ?? ''
  }

  private async callGemini(system: string, user: string, apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      logError(this.logger, 'ai.gemini_error', { status: res.status }, err)
      throw new BadRequestException('Gemini xatolik. Kalitni tekshiring.')
    }
    const data = await res.json() as any
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  }

  private buildSystemPrompt(): string {
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

    return `Sen BotForge platformasi uchun AI yordamchisan. Foydalanuvchi Telegram bot yaratmoqchi.
Uning tavsifiga qarab eng mos shablonni tanla va config to'ldir.

MAVJUD SHABLONLAR:
${templateList}

MAYDONLARI:
${templateDetails}

QOIDALAR:
1. botToken va ownerChatId DOIMO bo'sh qolsin
2. Foydalanuvchi tilida javob ber
3. catalog = JSON string: '[{"name":"...","price":...}]'
4. services/timeSlots/categories = JSON string: '["..."]'

JAVOB — faqat JSON:
{"templateKey":"...","config":{...},"explanation":"..."}`
  }
}

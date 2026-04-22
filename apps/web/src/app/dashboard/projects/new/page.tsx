'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProject } from '@/lib/projects'
import { generateConfigFromPrompt, applyAIConfig } from '@/lib/ai'
import { generateProject } from '@/lib/generated'
import { ApiError } from '@/lib/api'

const EXAMPLES = [
  "Picca restoran uchun buyurtma boti. Menyu: Margarita 50000, Pepperoni 60000, 4 Seasons 55000 so'm. Telefon va manzil so'ralsin.",
  "Sartaroshxona uchun bron boti. Xizmatlar: Soch olish, Soqol olish, Soch+Soqol. Vaqtlar: 9:00 dan 18:00 gacha har soatda.",
  "Mijozlardan ism, telefon va email yig'adigan lead boti. Xush kelibsiz xabari: Salom! Biz bilan bog'laning.",
  "Texnik yordam boti. Kategoriyalar: Internet muammo, To'lov, Umumiy savol. Murojaat qabul qilib adminga yuborsin.",
]

type Step = 'prompt' | 'loading' | 'preview' | 'tokens' | 'generating' | 'done'

export default function NewProjectPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('prompt')
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')

  // AI result
  const [templateKey, setTemplateKey] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [explanation, setExplanation] = useState('')

  // Token inputs
  const [botToken, setBotToken] = useState('')
  const [ownerChatId, setOwnerChatId] = useState('')

  // Project
  const [projectId, setProjectId] = useState('')

  async function handleGenerate() {
    if (!prompt.trim()) return
    setError('')
    setStep('loading')

    try {
      const result = await generateConfigFromPrompt(prompt)
      setTemplateKey(result.templateKey)
      setTemplateName(result.templateName)
      setConfig(result.config)
      setExplanation(result.explanation)
      setStep('preview')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI xatolik berdi')
      setStep('prompt')
    }
  }

  async function handleApply() {
    if (!botToken.trim() || !ownerChatId.trim()) {
      setError('Bot token va Chat ID kiritish shart')
      return
    }

    setError('')
    setStep('generating')

    try {
      // 1. Create project
      const botName = (config.welcomeMessage as string)?.slice(0, 30) || templateName
      const project = await createProject({ name: botName })
      setProjectId(project.id)

      // 2. Apply AI config with tokens
      const fullConfig = { ...config, botToken: botToken.trim(), ownerChatId: ownerChatId.trim() }
      await applyAIConfig(project.id, templateKey, fullConfig)

      // 3. Generate bot
      await generateProject(project.id)

      setStep('done')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi')
      setStep('tokens')
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/dashboard" className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-800">
        ← Mening botlarim
      </Link>

      {/* ── Step 1: Prompt ────────────────────────────────────────────── */}
      {step === 'prompt' && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Yangi bot yaratish</h1>
          <p className="mb-6 text-sm text-gray-500">
            Qanday bot kerakligini yozing — AI sizga tayyor bot yasab beradi.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Masalan: Picca restoran uchun buyurtma boti kerak. Menyu: Margarita 50000, Pepperoni 60000..."
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || prompt.trim().length < 10}
            className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            AI bilan bot yaratish
          </button>

          <div className="mt-6">
            <p className="mb-3 text-xs font-medium text-gray-400">Misollar:</p>
            <div className="space-y-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="block w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-xs text-gray-600 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Loading ───────────────────────────────────────────── */}
      {step === 'loading' && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">AI bot sozlamoqda...</p>
          <p className="mt-1 text-xs text-gray-400">Bu bir necha soniya oladi</p>
        </div>
      )}

      {/* ── Step 3: Preview ───────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <h2 className="text-lg font-bold text-green-800">AI bot tayyor!</h2>
            </div>
            <p className="text-sm text-green-700">{explanation}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">{templateName}</span>
              <span className="text-xs text-gray-400">{templateKey}</span>
            </div>

            <h3 className="mb-3 text-sm font-semibold text-gray-700">Sozlamalar:</h3>
            <div className="space-y-2">
              {Object.entries(config).filter(([k]) => k !== 'botToken' && k !== 'ownerChatId').map(([key, val]) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="min-w-[120px] shrink-0 font-medium text-gray-500">{key}:</span>
                  <span className="text-gray-700">{typeof val === 'string' ? val : JSON.stringify(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('tokens')}
              className="flex-1 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Davom etish →
            </button>
            <button
              onClick={() => { setStep('prompt'); setError('') }}
              className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Qayta yozish
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Token inputs ──────────────────────────────────────── */}
      {(step === 'tokens') && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Bot tokenlarini kiriting</h2>
          <p className="mb-6 text-sm text-gray-500">
            @BotFather dan olingan tokenni va o&apos;zingizning Chat ID ni kiriting.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Bot Token *</label>
              <p className="mb-1.5 text-xs text-gray-500">@BotFather da /newbot buyrug&apos;i bilan oling</p>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:AAH..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Admin Chat ID *</label>
              <p className="mb-1.5 text-xs text-gray-500">@userinfobot dan o&apos;zingizning ID ni bilib oling</p>
              <input
                type="text"
                value={ownerChatId}
                onChange={(e) => setOwnerChatId(e.target.value)}
                placeholder="5534263450"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleApply}
              disabled={!botToken.trim() || !ownerChatId.trim()}
              className="flex-1 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Bot yaratish
            </button>
            <button
              onClick={() => setStep('preview')}
              className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Orqaga
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Generating ────────────────────────────────────────── */}
      {step === 'generating' && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Bot yaratilmoqda...</p>
          <p className="mt-1 text-xs text-gray-400">Shablon, config va kod generatsiya qilinmoqda</p>
        </div>
      )}

      {/* ── Step 6: Done ──────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mb-3 text-4xl">🎉</div>
          <h2 className="mb-2 text-xl font-bold text-green-800">Bot tayyor!</h2>
          <p className="mb-6 text-sm text-green-700">
            Bot kodi yaratildi. Endi deploy qilsangiz Telegramda ishlaydi.
          </p>
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}`)}
            className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Deploy qilish →
          </button>
        </div>
      )}
    </main>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  getTemplateDetail,
  type ConfigField,
  type TemplateDetail,
} from '@/lib/templates'
import { getProjectConfig, saveProjectConfig, type BotConfig } from '@/lib/projects'
import { ApiError } from '@/lib/api'

interface Props {
  projectId: string
  templateKey: string
  /** Called after a successful save so the parent can refresh overview state. */
  onSaved?: () => void
}

type FormValues = Record<string, string | boolean>

/**
 * Builds initial form values from saved config.
 * Fields whose saved value is '__MASKED__' (secrets) are rendered as empty inputs,
 * and their names are added to maskedFields so submit can preserve the existing secret.
 */
function buildInitialValues(
  fields: ConfigField[],
  saved: Record<string, unknown> | null,
  maskedFields: Set<string>,
): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    if (saved && field.name in saved) {
      const savedVal = saved[field.name]
      if (savedVal === '__MASKED__') {
        // Secret field with a saved value — show empty input; track it as masked
        values[field.name] = ''
        maskedFields.add(field.name)
      } else {
        values[field.name] = savedVal as string | boolean
      }
    } else if (field.defaultValue !== undefined) {
      values[field.name] = field.defaultValue
    } else {
      values[field.name] = field.type === 'boolean' ? false : ''
    }
  }
  return values
}

export default function ConfigForm({ projectId, templateKey, onSaved }: Props) {
  const t = useTranslations('configForm')
  const tc = useTranslations('common')
  const [detail, setDetail] = useState<TemplateDetail | null>(null)
  const [values, setValues] = useState<FormValues>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  // Tracks fields whose current saved value is '__MASKED__' (secrets already stored server-side).
  // On submit, any blank value for a masked field is sent as '__MASKED__' to preserve the secret.
  const maskedFieldsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      getTemplateDetail(templateKey),
      getProjectConfig(projectId),
    ])
      .then(([tplDetail, config]: [TemplateDetail, BotConfig | null]) => {
        setDetail(tplDetail)
        const masked = new Set<string>()
        setValues(buildInitialValues(tplDetail.fields, config?.configData ?? null, masked))
        maskedFieldsRef.current = masked
        if (config?.validatedAt) setSavedAt(new Date(config.validatedAt))
      })
      .catch(() => setError(t('loadError')))
      .finally(() => setLoading(false))
  }, [projectId, templateKey, t])

  const handleChange = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      // For masked fields left blank, send '__MASKED__' so the server preserves the existing secret
      const payload: FormValues = { ...values }
      for (const fieldName of maskedFieldsRef.current) {
        if (payload[fieldName] === '') {
          payload[fieldName] = '__MASKED__'
        }
      }
      const config = await saveProjectConfig(projectId, payload)
      setSavedAt(config.validatedAt ? new Date(config.validatedAt) : new Date())
      onSaved?.()
    } catch (err) {
      if (err instanceof ApiError) {
        // Try to parse structured validation errors
        try {
          const body = JSON.parse(err.message)
          if (body?.errors) {
            setFieldErrors(body.errors)
            return
          }
        } catch {
          // not JSON, fall through
        }
        setError(err.message)
      } else {
        setError(t('saveError'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">{tc('loading')}</p>
  }

  if (error && !detail) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!detail) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {detail.fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={values[field.name]}
          errors={fieldErrors[field.name] ?? []}
          onChange={(val) => handleChange(field.name, val)}
          hasSavedSecret={maskedFieldsRef.current.has(field.name)}
        />
      ))}

      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('saving') : t('saveBtn')}
        </button>
        {savedAt && (
          <span className="text-xs text-gray-400">
            {t('lastSaved', { time: savedAt.toLocaleTimeString() })}
          </span>
        )}
      </div>
    </form>
  )
}

// ── Single field renderer ─────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  errors,
  onChange,
  hasSavedSecret,
}: {
  field: ConfigField
  value: string | boolean | undefined
  errors: string[]
  onChange: (val: string | boolean) => void
  hasSavedSecret?: boolean
}) {
  const t = useTranslations('configForm')

  const inputClass = [
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition',
    errors.length > 0
      ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
      : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
  ].join(' ')

  if (field.type === 'boolean') {
    return (
      <div className="flex items-start gap-3">
        <input
          id={field.name}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <div>
          <label htmlFor={field.name} className="text-sm font-medium text-gray-700 cursor-pointer">
            {field.label}
          </label>
          {field.description && (
            <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {field.description && (
        <p className="mb-1.5 text-xs text-gray-500">{field.description}</p>
      )}

      {field.type === 'textarea' ? (
        <textarea
          id={field.name}
          rows={3}
          required={field.required}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : field.type === 'select' && field.options ? (
        <select
          id={field.name}
          required={field.required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Tanlang...</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'number' ? (
        <input
          id={field.name}
          type="number"
          required={field.required}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          id={field.name}
          type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
          required={field.required}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}

      {field.type === 'password' && hasSavedSecret && errors.length === 0 && (
        <p className="mt-1 text-xs text-gray-400">{t('secretHint')}</p>
      )}
      {errors.length > 0 && (
        <p className="mt-1 text-xs text-red-600">{errors[0]}</p>
      )}
    </div>
  )
}

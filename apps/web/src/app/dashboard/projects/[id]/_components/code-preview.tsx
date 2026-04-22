'use client'

import { useEffect, useState } from 'react'
import { getGenerationPreview, type FilePreview } from '@/lib/generated'

interface Props {
  projectId: string
}

export default function CodePreview({ projectId }: Props) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFile, setActiveFile] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    getGenerationPreview(projectId)
      .then((data) => {
        setFiles(data.files)
        if (data.files.length > 0) setActiveFile(data.files[0].path)
      })
      .catch(() => setError("Ko'rib chiqish uchun avval kodni yarating"))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <p className="text-sm text-gray-400">Yuklanmoqda...</p>
  if (error) return <p className="text-sm text-gray-500">{error}</p>
  if (files.length === 0) return null

  const active = files.find((f) => f.path === activeFile)

  return (
    <div className="space-y-3">
      {/* File tabs */}
      <div className="flex flex-wrap gap-1">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => setActiveFile(f.path)}
            className={`rounded px-2.5 py-1 text-[11px] font-mono transition ${
              f.path === activeFile
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.path}
          </button>
        ))}
      </div>

      {/* Code view */}
      {active && (
        <div className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-950 p-4">
          <pre className="text-xs leading-relaxed text-gray-300 font-mono whitespace-pre">
            {active.preview}
          </pre>
        </div>
      )}
    </div>
  )
}

const STATUS_MAP: Record<string, { classes: string; label: string }> = {
  DRAFT:      { classes: 'bg-gray-100 text-gray-600',     label: 'Draft' },
  CONFIGURED: { classes: 'bg-blue-50 text-blue-700',      label: 'Configured' },
  GENERATING: { classes: 'bg-indigo-50 text-indigo-700',  label: 'Generating' },
  GENERATED:  { classes: 'bg-indigo-100 text-indigo-800', label: 'Generated' },
  DEPLOYING:  { classes: 'bg-purple-50 text-purple-700',  label: 'Deploying' },
  LIVE:       { classes: 'bg-green-100 text-green-700',   label: 'Live' },
  FAILED:     { classes: 'bg-red-50 text-red-600',        label: 'Failed' },
  ARCHIVED:   { classes: 'bg-gray-50 text-gray-400',      label: 'Archived' },
}

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const entry = STATUS_MAP[status] ?? { classes: 'bg-gray-100 text-gray-600', label: status }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.classes}`}>
      {entry.label}
    </span>
  )
}

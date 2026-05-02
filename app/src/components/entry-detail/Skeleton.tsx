type Props = {
  rows?: number
  color?: string
}

export default function Skeleton({ rows = 3, color = '#e9d9cc' }: Props) {
  const widths = ['w-full', 'w-4/5', 'w-3/5', 'w-2/3', 'w-1/2']
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 animate-pulse rounded ${widths[i % widths.length]}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

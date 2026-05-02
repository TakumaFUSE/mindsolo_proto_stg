export default function EntryDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-4 text-[0.86rem] text-muted">
      entry_detail — id: {params.id} (Phase 5-2 以降で実装)
    </div>
  )
}

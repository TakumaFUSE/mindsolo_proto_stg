export default function MentorThreadPage({ params }: { params: { threadId: string } }) {
  return (
    <div className="p-4 text-[0.86rem] text-muted">
      mentor_thread — threadId: {params.threadId} (Phase 5-3 以降で実装)
    </div>
  )
}

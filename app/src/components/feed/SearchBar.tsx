'use client'

import { useState } from 'react'

const BTN = 'shrink-0 rounded-xl border border-[#e9d9cc] bg-white px-3 py-2 text-[0.76rem] font-bold text-[#6f6259] transition-transform hover:-translate-y-px active:scale-95'

export default function SearchBar() {
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    // TODO: implement search
  }

  return (
    <form onSubmit={handleSearch} className="mb-3 flex gap-1.5">
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="キーワードで検索"
        className="min-w-0 flex-1 !rounded-xl !py-2 !px-3 !text-[0.84rem]"
      />
      <button type="submit" className={BTN}>検索</button>
      <button type="button" className={BTN}>絞る</button>
      <button type="button" className={BTN}>並び替え</button>
    </form>
  )
}

'use client'
import { forwardRef, useImperativeHandle, useRef } from 'react'

export type ImageUploaderHandle = {
  triggerUpload: () => void
  triggerCamera: () => void
}

type Props = {
  files: File[]
  onChange: (files: File[]) => void
}

const ImageUploader = forwardRef<ImageUploaderHandle, Props>(function ImageUploader(
  { files, onChange },
  ref,
) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    triggerUpload: () => uploadRef.current?.click(),
    triggerCamera: () => cameraRef.current?.click(),
  }))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) onChange([...files, ...picked])
    e.target.value = ''
  }

  function remove(i: number) {
    onChange(files.filter((_, idx) => idx !== i))
  }

  return (
    <>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {files.length > 0 && (
        <div className="mb-3 flex gap-2.5 overflow-x-auto pb-1">
          {files.map((f, i) => (
            <div key={i} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt=""
                className="h-[126px] min-w-[150px] rounded-[14px] border border-[#e5d6c9] object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#d8c1af] bg-white text-[0.75rem] text-[#8b7d73] shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
})

export default ImageUploader

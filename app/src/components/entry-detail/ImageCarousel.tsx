type Props = { imageUrls: string[] }

export default function ImageCarousel({ imageUrls }: Props) {
  if (!imageUrls.length) return null
  return (
    <div
      className="mb-3 flex gap-2.5 overflow-x-auto pb-1"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {imageUrls.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="h-[126px] min-w-[150px] shrink-0 rounded-[14px] border border-[#e5d6c9] object-cover"
          style={{ scrollSnapAlign: 'start' }}
        />
      ))}
    </div>
  )
}

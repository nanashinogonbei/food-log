import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { formatJapaneseDate } from '../valuation/format.ts'
import { PHOTO_BASE_URL } from './photoRequest.ts'
import type { ProductPhotoDetail } from './data.ts'

/** サムネイルがこの枚数を超えたらカルーセルにする（＝4枚目以降） */
const CAROUSEL_THRESHOLD = 3

interface ProductImagesProps {
  productName: string
  /** 投稿日が新しい順（同じ投稿内は優先順位順）に並んだ写真 */
  photos: ProductPhotoDetail[]
  /** 画像の一番下に表示する内容（「この商品の画像を投稿する」ボタンなど） */
  footer?: ReactNode
}

/** 表示名が未設定のユーザーに使う名前（UserValuationPage と同じ） */
const DEFAULT_USER_NAME = '未指定'

/** 「2026年11月17日 ユーザー名 投稿」の形式にする */
const formatPostedCaption = (photo: ProductPhotoDetail) => {
  const date = formatJapaneseDate(photo.createdAt)
  return date ? `${date} ${photo.userDisplayName || DEFAULT_USER_NAME} 投稿` : ''
}


/** サムネイルの下に表示する短い日付（例: 2026/11/17）。不正な日付なら空文字 */
const formatShortDate = (createdAt: string) => {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 商品ページの画像エリア(.cluster-img)。
 * 大きい画像と、投稿日つきのサムネイル一覧を表示する。サムネイルが4枚以上のときはカルーセルになる。
 * 画像はfigureでマークアップし、figcaptionで投稿日を表示する。
 */
function ProductImages({ productName, photos, footer }: ProductImagesProps) {
  // 大きい画像に表示中のサムネイルのインデックス（サムネイルにマウスオーバー/フォーカス/クリックで切り替え）
  const [activeIndex, setActiveIndex] = useState(0)
  // カルーセルの端まで進んだか（前後ボタンの有効・無効の切り替え用）
  const [edge, setEdge] = useState({ start: true, end: false })
  const trackRef = useRef<HTMLUListElement>(null)

  const isCarousel = photos.length > CAROUSEL_THRESHOLD
  const active = photos[activeIndex] ?? photos[0]

  const updateEdge = () => {
    const track = trackRef.current
    if (!track) {
      return
    }
    setEdge({
      start: track.scrollLeft <= 1,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    })
  }

  const scrollThumbs = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) {
      return
    }
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="cluster-img">
		
      {active && (
        <figure className="stack-imgMain">
          <img src={`${PHOTO_BASE_URL}${active.url}`} alt={productName} />
          <figcaption>{formatPostedCaption(active)}</figcaption>
        </figure>
      )}

      {photos.length > 1 ? (
				<>
				
				<ul className={`stack-thumbTrack${isCarousel ? ' -carousel' : ''}`} ref={trackRef} onScroll={isCarousel ? updateEdge : undefined}>
					{photos.map((photo, index) => (
						<li key={photo.url} className="item">
							<figure className={index === activeIndex ? '-active' : undefined}>
								<a
									href={`${PHOTO_BASE_URL}${photo.url}`}
									onMouseEnter={() => setActiveIndex(index)}
									onFocus={() => setActiveIndex(index)}
									onClick={(event) => {
										// 画像ページへは遷移せず、大きい画像を切り替える
										event.preventDefault()
										setActiveIndex(index)
									}}
									aria-label={`${index + 1}枚目の画像を表示`}
									aria-current={index === activeIndex}
								>
									<img src={`${PHOTO_BASE_URL}${photo.url}`} alt="" />
								</a>
								<figcaption>{formatShortDate(photo.createdAt)}</figcaption>
							</figure>
						</li>
					))}
				</ul>
				
				{isCarousel ? (
					<div className="stack-buttons">
						{footer}
						<div className="stack-carouselButton">
							<button
								type="button"
								className="button-prev"
								aria-label="前の画像を表示"
								disabled={edge.start}
								onClick={() => scrollThumbs(-1)}
							>
								◀
							</button>
							<button
								type="button"
								className="button-next"
								aria-label="次の画像を表示"
								disabled={edge.end}
								onClick={() => scrollThumbs(1)}
							>
								▶
							</button>
						</div>
					</div>
				) : (
					<div className="stack-buttons">
						{footer}
					</div>
				)}
				
				</>
      ) : (
				<div className="stack-buttons">
					{footer}
				</div>
			)}
      
    </div>
  )
}

export default ProductImages

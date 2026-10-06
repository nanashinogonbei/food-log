import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductSearch } from '../product/useProducts.ts'

// トップページでは商品名の2文字目からサジェストを表示する
const SEARCH_MIN_LENGTH = 2
const LIST_ID = 'product-search-suggestions'

/**
 * 商品名の一部を、検索語に一致する部分だけ <mark> で強調して表示する。
 */
function HighlightedName({ name, query }: { name: string; query: string }) {
  const index = name.toLowerCase().indexOf(query.toLowerCase())

  if (query === '' || index < 0) {
    return <>{name}</>
  }

  return (
    <>
      {name.slice(0, index)}
      <mark>{name.slice(index, index + query.length)}</mark>
      {name.slice(index + query.length)}
    </>
  )
}

/**
 * トップページの「商品名から探す」: 商品名の部分一致でサジェストを表示し、
 * 選択した商品の製品ページ (/product/[id]) へ遷移する。
 * 承認待ち(pending)の商品は候補に含めない。
 */
function ProductSearchBox() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // IME変換中のEnter(変換確定)で遷移してしまわないようにする
  const [isComposing, setIsComposing] = useState(false)

  const trimmedQuery = query.trim()
  const { candidates, isSearching, error } = useProductSearch(query, {
    minLength: SEARCH_MIN_LENGTH,
    publicOnly: true,
  })

  const showSuggestions = isOpen && trimmedQuery.length >= SEARCH_MIN_LENGTH
  const hasActiveCandidate = activeIndex >= 0 && activeIndex < candidates.length

  // 検索ボックスの外側をクリックしたらサジェストを閉じる
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const goToProduct = (productId: number) => {
    setIsOpen(false)
    navigate(`/product/${productId}`)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
    setActiveIndex(-1)
    setIsOpen(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) {
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        if (candidates.length > 0) {
          event.preventDefault()
          setIsOpen(true)
          setActiveIndex((current) => (current + 1) % candidates.length)
        }
        break
      case 'ArrowUp':
        if (candidates.length > 0) {
          event.preventDefault()
          setIsOpen(true)
          setActiveIndex((current) => (current <= 0 ? candidates.length - 1 : current - 1))
        }
        break
      case 'Enter':
        // 選択中の候補、なければ先頭の候補へ遷移する
        if (showSuggestions && candidates.length > 0) {
          event.preventDefault()
          goToProduct(candidates[hasActiveCandidate ? activeIndex : 0].id)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div className="product-search" ref={containerRef}>
      <input
        type="search"
        className="product-search__input"
        placeholder="商品名を入力（2文字以上）"
        value={query}
        autoComplete="off"
        role="combobox"
        aria-label="商品名で検索"
        aria-expanded={showSuggestions && candidates.length > 0}
        aria-controls={LIST_ID}
        aria-autocomplete="list"
        aria-activedescendant={hasActiveCandidate ? `${LIST_ID}-${candidates[activeIndex].id}` : undefined}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
      />

      {showSuggestions && (
        <>
          {isSearching && <p className="product-search__message">検索中...</p>}
          {error && <p className="product-search__message">{error}</p>}
          {!isSearching && !error && candidates.length === 0 && (
            <p className="product-search__message">該当する商品が見つかりませんでした。</p>
          )}
          {candidates.length > 0 && (
            <ul className="autocomplete__list" id={LIST_ID} role="listbox">
              {candidates.map((candidate, index) => (
                <li
                  key={candidate.id}
                  id={`${LIST_ID}-${candidate.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`autocomplete__item${index === activeIndex ? ' autocomplete__item--active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goToProduct(candidate.id)}
                >
                  {candidate.photos[0] && (
                    <img src={`http://production-null.work/food-log${candidate.photos[0]}`} alt={candidate.name} />
                  )}
                  <span className="autocomplete__item-name">
                    <HighlightedName name={candidate.name} query={trimmedQuery} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default ProductSearchBox

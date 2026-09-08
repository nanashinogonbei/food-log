import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'

function RequestPage() {
  const { userId } = useParams<{ userId: string }>()
  const [productName, setProductName] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // TODO: 商品申請APIの呼び出しに置き換える
    console.log(`[${userId}] 商品申請:`, productName)
  }

  return (
    <div className="page">
      <h1 className="page__title">商品申請</h1>
      <form onSubmit={handleSubmit}>
		<div>
			<label htmlFor="productName">商品名【必須】</label>
			<input
			  id="productName"
			  type="text"
			  value={productName}
			  onChange={(event) => setProductName(event.target.value)}
			/>
		</div>
		<div>
			<label htmlFor="productName">販売会社【必須】</label>
			<input
			  id="productName"
			  type="text"
			  value={productName}
			  onChange={(event) => setProductName(event.target.value)}
			/>
		</div>
		<div>
			<label htmlFor="productName">製造会社</label>
			<input
			  id="productName"
			  type="text"
			  value={productName}
			  onChange={(event) => setProductName(event.target.value)}
			/>
		</div>
        <button type="submit">申請する</button>
      </form>
    </div>
  )
}

export default RequestPage

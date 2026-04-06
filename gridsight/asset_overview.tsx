import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
}

interface AssetOverview {
  id: string
  name: string
  priceUsd: number
  supply: number
  holders: number
  volume24h?: number
  marketCap?: number
}

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({ assetId }) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function fetchInfo() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/assets/${assetId}`)
        if (!res.ok) throw new Error(`Failed to fetch asset ${assetId}`)
        const json = (await res.json()) as AssetOverview
        setInfo({ ...json, id: assetId })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [assetId])

  if (loading) return <div>Loading asset overview...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>
  if (!info) return <div>No data available.</div>

  return (
    <div className="p-4 bg-white rounded shadow space-y-1">
      <h2 className="text-xl font-semibold mb-2">Asset Overview</h2>
      <p><strong>ID:</strong> {info.id}</p>
      <p><strong>Name:</strong> {info.name}</p>
      <p><strong>Price (USD):</strong> ${info.priceUsd.toFixed(2)}</p>
      <p><strong>Circulating Supply:</strong> {info.supply.toLocaleString()}</p>
      <p><strong>Holders:</strong> {info.holders.toLocaleString()}</p>
      {info.volume24h !== undefined && (
        <p><strong>24h Volume:</strong> {info.volume24h.toLocaleString()}</p>
      )}
      {info.marketCap !== undefined && (
        <p><strong>Market Cap:</strong> ${info.marketCap.toLocaleString()}</p>
      )}
    </div>
  )
}

export default AssetOverviewPanel

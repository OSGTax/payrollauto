import { useCallback, useState } from 'react'

interface GpsCoords {
  lat: number
  lng: number
  accuracy: number
}

export function useGps() {
  const [capturing, setCapturing] = useState(false)

  const capture = useCallback((): Promise<GpsCoords | null> => {
    if (!navigator.geolocation) return Promise.resolve(null)

    setCapturing(true)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCapturing(false)
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          })
        },
        () => {
          setCapturing(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      )
    })
  }, [])

  return { capture, capturing }
}

import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

type Props = {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void
}

export function SearchBar({ onPlaceSelect }: Props) {
  const placesLib = useMapsLibrary('places')
  const geocodingLib = useMapsLibrary('geocoding')
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const callbackRef = useRef(onPlaceSelect)
  const placeChangedAtRef = useRef(0)
  callbackRef.current = onPlaceSelect

  useEffect(() => {
    if (!geocodingLib) return
    geocoderRef.current = new geocodingLib.Geocoder()
  }, [geocodingLib])

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
      componentRestrictions: { country: 'au' },
    })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      placeChangedAtRef.current = Date.now()
      const place = autocompleteRef.current!.getPlace()
      if (place.geometry) callbackRef.current(place)
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib])

  function handleSearch() {
    const query = inputRef.current?.value?.trim()
    if (!query || !geocoderRef.current) return

    geocoderRef.current.geocode(
      { address: query, componentRestrictions: { country: 'au' } },
      (results, status) => {
        if (status === 'OK' && results?.[0]) {
          callbackRef.current({
            geometry: results[0].geometry,
            formatted_address: results[0].formatted_address,
            name: results[0].formatted_address,
          })
        }
      }
    )
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    // If autocomplete's place_changed just fired (user selected from dropdown), skip geocode
    if (Date.now() - placeChangedAtRef.current < 150) return
    handleSearch()
  }

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search address..."
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors shrink-0"
          aria-label="Search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

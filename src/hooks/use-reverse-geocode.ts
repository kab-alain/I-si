import { useState, useEffect } from 'react';

interface ReverseGeocodeResult {
  locationName: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Reverse geocodes a lat/lon pair to a human-readable location name
 * using the free OpenStreetMap Nominatim API (no API key required).
 */
export function useReverseGeocode(lat: number | null, lon: number | null): ReverseGeocodeResult {
  const [state, setState] = useState<ReverseGeocodeResult>({
    locationName: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (lat === null || lon === null) {
      setState({ locationName: null, isLoading: false, error: null });
      return;
    }

    let cancelled = false;

    const fetchLocationName = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
          {
            headers: {
              // Nominatim requires a User-Agent identifying your app
              'Accept-Language': 'en',
            },
          }
        );

        if (!response.ok) throw new Error('Geocoding request failed');

        const data = await response.json();

        if (cancelled) return;

        if (data && data.address) {
          const { city, town, village, county, state: region, country } = data.address;
          // Build a concise "City/Town, Country" style name
          const place = city || town || village || county || region || '';
          const locationName = [place, country].filter(Boolean).join(', ');
          setState({ locationName: locationName || data.display_name || null, isLoading: false, error: null });
        } else {
          setState({ locationName: null, isLoading: false, error: null });
        }
      } catch {
        if (!cancelled) {
          setState({ locationName: null, isLoading: false, error: 'Could not resolve location name' });
        }
      }
    };

    fetchLocationName();

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  return state;
}

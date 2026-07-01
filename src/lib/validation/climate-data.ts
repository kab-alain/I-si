/**
 * Climate Data Validation
 * Validates inputs before risk calculations and applies sensible fallbacks.
 */

export interface ValidationWarning {
  field: string;
  message: string;
  usedFallback: boolean;
}

export interface ValidatedClimateInputs {
  rainfall: number;
  temperature: number;
  ndvi: number;
  coordinates: { lat: number; lon: number };
  warnings: ValidationWarning[];
}

// Sensible defaults for Rwanda
const FALLBACKS = {
  rainfall: 5, // mm/day average
  temperature: 22.5, // °C
  ndvi: 0.5, // moderate vegetation
  lat: -1.9403, // Kigali
  lon: 29.8739,
};

export function validateRainfall(value: unknown): { value: number; warning?: ValidationWarning } {
  if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 500) {
    return { value };
  }
  return {
    value: FALLBACKS.rainfall,
    warning: {
      field: 'rainfall',
      message: 'Rainfall data unavailable or invalid. Using regional average (5 mm/day).',
      usedFallback: true,
    },
  };
}

export function validateTemperature(value: unknown): { value: number; warning?: ValidationWarning } {
  if (typeof value === 'number' && !isNaN(value) && value >= -50 && value <= 60) {
    return { value };
  }
  return {
    value: FALLBACKS.temperature,
    warning: {
      field: 'temperature',
      message: 'Temperature data unavailable or invalid. Using regional average (22.5°C).',
      usedFallback: true,
    },
  };
}

export function validateNDVI(value: unknown): { value: number; warning?: ValidationWarning } {
  if (typeof value === 'number' && !isNaN(value) && value >= -1 && value <= 1) {
    return { value };
  }
  return {
    value: FALLBACKS.ndvi,
    warning: {
      field: 'ndvi',
      message: 'Vegetation index (NDVI) unavailable or invalid. Using moderate vegetation estimate.',
      usedFallback: true,
    },
  };
}

export function validateCoordinates(
  lat: unknown,
  lon: unknown
): { value: { lat: number; lon: number }; warning?: ValidationWarning } {
  const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const lonNum = typeof lon === 'number' ? lon : parseFloat(String(lon));

  if (
    !isNaN(latNum) &&
    !isNaN(lonNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lonNum >= -180 &&
    lonNum <= 180
  ) {
    return { value: { lat: latNum, lon: lonNum } };
  }

  return {
    value: { lat: FALLBACKS.lat, lon: FALLBACKS.lon },
    warning: {
      field: 'coordinates',
      message: 'Invalid coordinates. Using Kigali, Rwanda as default location.',
      usedFallback: true,
    },
  };
}

/**
 * Validate all climate inputs at once before risk calculations.
 */
export function validateClimateInputs(
  lat: unknown,
  lon: unknown,
  rainfall?: unknown,
  temperature?: unknown,
  ndvi?: unknown
): ValidatedClimateInputs {
  const warnings: ValidationWarning[] = [];

  const coords = validateCoordinates(lat, lon);
  if (coords.warning) warnings.push(coords.warning);

  const rain = validateRainfall(rainfall);
  if (rain.warning) warnings.push(rain.warning);

  const temp = validateTemperature(temperature);
  if (temp.warning) warnings.push(temp.warning);

  const ndviResult = validateNDVI(ndvi);
  if (ndviResult.warning) warnings.push(ndviResult.warning);

  return {
    rainfall: rain.value,
    temperature: temp.value,
    ndvi: ndviResult.value,
    coordinates: coords.value,
    warnings,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { getAgricultureRecommendations } from '@/lib/api/agriculture';

/**
 * Public Agriculture & Vegetation Recommendation API Endpoint
 * 
 * GET /api/agriculture/recommendation?lat=-1.9403&lon=29.8739&elevation=1500&ndvi=0.55
 * 
 * Returns:
 * - Agro-Ecological Zone classification (Rwanda)
 * - Vegetation condition and biomass status
 * - FAO-56 Evapotranspiration (ET0) & soil moisture metrics
 * - Recommended crops (staple, cash, vegetable, agroforestry)
 * - Actionable preparation guidelines for farmers
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const elevParam = searchParams.get('elevation');
    const ndviParam = searchParams.get('ndvi');

    const lat = latParam ? parseFloat(latParam) : -1.9403; // Default to Kigali
    const lon = lonParam ? parseFloat(lonParam) : 29.8739;
    const elevation = elevParam ? parseFloat(elevParam) : 1500;
    const ndvi = ndviParam ? parseFloat(ndviParam) : 0.45;

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Please provide valid numeric lat and lon parameters.' },
        { status: 400 }
      );
    }

    const recommendations = await getAgricultureRecommendations({
      latitude: lat,
      longitude: lon,
      elevation,
      ndvi
    });

    return NextResponse.json({
      success: true,
      data: recommendations
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
      }
    });
  } catch (error) {
    console.error('Agriculture recommendation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate agricultural recommendations'
      },
      { status: 500 }
    );
  }
}

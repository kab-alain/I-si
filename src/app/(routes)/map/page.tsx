'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { MapContainer } from './components/map-container';
import { LayerControls } from './components/layer-controls';
import { MapLegend } from './components/map-legend';
import { RiskSummary } from './components/risk-summary';
import { LocationDataPanel } from './components/location-data-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import { AuthGuard } from '@/components/auth-guard';

export default function MapPage() {
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [mapStyle, setMapStyle] = useState('streets-v12');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <AuthGuard>
        <div className="relative flex flex-col md:flex-row h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden">
          {/* Mobile Sidebar Toggle Button */}
          <div className="md:hidden absolute top-3 left-3 z-30">
            <Button
              variant="default"
              size="sm"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="shadow-lg text-xs gap-1.5 bg-background/90 text-foreground border border-border backdrop-blur hover:bg-background"
            >
              {mobileSidebarOpen ? (
                <>
                  <MapIcon className="h-3.5 w-3.5 text-primary" />
                  <span>Show Map</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  <span>Map Controls</span>
                </>
              )}
            </Button>
          </div>

          {/* Sidebar */}
          <div
            className={cn(
              "border-r bg-background overflow-y-auto transition-all duration-300 z-20",
              mobileSidebarOpen
                ? "absolute inset-0 w-full h-full md:relative md:w-80 md:h-auto"
                : "hidden md:block md:w-80"
            )}
          >
            <div className="p-4 space-y-4 pt-14 md:pt-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold mb-1">Climate Risk Map</h1>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Interactive visualization & 30-day climate assessment across Rwanda
                </p>
              </div>

              <Tabs defaultValue="layers" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="layers">Layers</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="layers" className="space-y-4">
                  <LayerControls
                    selectedLayers={selectedLayers}
                    onLayersChange={setSelectedLayers}
                    timeRange={selectedTimeRange}
                    onTimeRangeChange={setSelectedTimeRange}
                    mapStyle={mapStyle}
                    onMapStyleChange={setMapStyle}
                  />
                  <MapLegend selectedLayers={selectedLayers} />
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                  <LocationDataPanel />
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  <RiskSummary />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative h-full w-full overflow-hidden">
            <MapContainer
              selectedLayers={selectedLayers}
              timeRange={selectedTimeRange}
              mapStyle={mapStyle}
            />
          </div>
        </div>
      </AuthGuard>
    </div>
  );
}

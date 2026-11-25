import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({ listings = [], onSelectListing }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [28.6304, 77.3721], // Sector 62 Noida (JIIT campus area)
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // Map pins for listings
    listings.forEach(listing => {
      const isResolved = listing.status === 'resolved';
      
      const pinColors = {
        rescue: '#ef4444',
        feed: '#f59e0b',
        shelter: '#3b82f6',
        vaccine: '#8b5cf6',
        clothes: '#ec4899',
        adoption: '#10b981'
      };

      const color = isResolved ? '#64748b' : (pinColors[listing.help_type] || '#10b981');

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background: ${color};
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            <span style="transform: rotate(45deg); font-size: 14px;">
              ${listing.species_icon || '🐾'}
            </span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([listing.latitude, listing.longitude], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '180px';
      popupContent.innerHTML = `
        <div style="font-family: system-ui, sans-serif;">
          <img src="${listing.photo_url}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 10px; margin-bottom: 6px;" />
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <b style="font-size: 12px; color: #1e293b;">${listing.animal_nickname || listing.species_name || 'Animal in need'}</b>
            <span style="font-size: 9px; padding: 2px 6px; border-radius: 9999px; background: #dcfce7; color: #166534; font-weight: bold; text-transform: uppercase;">${listing.help_type}</span>
          </div>
          <p style="font-size: 10px; color: #64748b; margin: 0 0 6px 0; line-height: 1.3;">${listing.description.substring(0, 60)}...</p>
          <button id="view-listing-${listing.listing_id}" style="
            width: 100%;
            background: #16a34a;
            color: white;
            border: none;
            padding: 5px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
          ">View Listing</button>
        </div>
      `;

      popupContent.querySelector(`#view-listing-${listing.listing_id}`)?.addEventListener('click', () => {
        if (onSelectListing) onSelectListing(listing);
      });

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });

    // Invalidate size to ensure rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

  }, [listings, onSelectListing]);

  return (
    <div className="w-full h-[520px] rounded-3xl overflow-hidden border border-slate-200 shadow-cute relative z-10">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Legend overlay */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-slate-200/60 text-[10px] flex items-center gap-2 pointer-events-none z-[1000]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="font-bold text-slate-700">Live Animal Aid Map (Noida)</span>
      </div>
    </div>
  );
}

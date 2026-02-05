import { useEffect, useRef } from "react";
import L from "leaflet";

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ClubLocation {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

interface ClubMapProps {
  clubs: ClubLocation[];
  center?: [number, number];
  zoom?: number;
  onClubClick?: (clubId: number) => void;
  className?: string;
}

export function ClubMap({ clubs, center = [51.5074, -0.1278], zoom = 10, onClubClick, className = "" }: ClubMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    const clubsWithCoords = clubs.filter(club => club.latitude && club.longitude);
    
    clubsWithCoords.forEach(club => {
      const lat = parseFloat(club.latitude!);
      const lng = parseFloat(club.longitude!);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng]).addTo(mapInstanceRef.current!);
        
        // Create popup content safely using DOM API to prevent XSS
        const container = document.createElement('div');
        container.style.minWidth = '150px';
        
        const nameEl = document.createElement('strong');
        nameEl.textContent = club.name;
        container.appendChild(nameEl);
        
        if (club.city) {
          container.appendChild(document.createElement('br'));
          const cityEl = document.createElement('span');
          cityEl.style.color = '#666';
          cityEl.textContent = club.city;
          container.appendChild(cityEl);
        }
        
        if (club.postcode) {
          container.appendChild(document.createElement('br'));
          const postcodeEl = document.createElement('span');
          postcodeEl.style.color = '#888';
          postcodeEl.style.fontSize = '0.9em';
          postcodeEl.textContent = club.postcode;
          container.appendChild(postcodeEl);
        }
        
        marker.bindPopup(container);
        
        if (onClubClick) {
          marker.on('click', () => onClubClick(club.id));
        }
      }
    });

    if (clubsWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        clubsWithCoords.map(club => [parseFloat(club.latitude!), parseFloat(club.longitude!)])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [clubs, onClubClick]);

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full min-h-[300px] rounded-lg ${className}`}
      data-testid="map-clubs"
    />
  );
}

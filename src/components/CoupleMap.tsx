import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";

export type MapPoint = { latitude: number; longitude: number; label: string; tone: "me" | "partner" };

function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.latitude, points[0]!.longitude], 14);
      return;
    }
    map.fitBounds(
      points.map((p) => [p.latitude, p.longitude] as [number, number]),
      { padding: [48, 48], maxZoom: 15 },
    );
  }, [map, points]);
  return null;
}

export default function CoupleMap({ points }: { points: MapPoint[] }) {
  const first = points[0];
  return (
    <MapContainer
      center={first ? [first.latitude, first.longitude] : [40.4168, -3.7038]}
      zoom={first ? 14 : 4}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <CircleMarker
          key={p.label}
          center={[p.latitude, p.longitude]}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: p.tone === "me" ? "#d9718a" : "#6f9c7f",
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} permanent>
            {p.label}
          </Tooltip>
        </CircleMarker>
      ))}
      <Fit points={points} />
    </MapContainer>
  );
}

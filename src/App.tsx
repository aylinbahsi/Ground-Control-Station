import React, { useState, useEffect } from 'react';
import './index.css';
import { Radio, Battery, Clock, Crosshair, MapPin, ArrowRightLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapUpdater = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

const DraggableMarker = ({ wp, updateWaypoint }: { wp: any, updateWaypoint: (id: string, lat: number, lng: number) => void }) => {
  const markerRef = React.useRef<L.Marker>(null);
  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          updateWaypoint(wp.id, newPos.lat, newPos.lng);
        }
      },
    }),
    [wp.id, updateWaypoint],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[wp.lat, wp.lng]}
      ref={markerRef}
      icon={
        L.divIcon({
          html: `<div style="background-color: #f59e0b; color: black; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); cursor: grab; pointer-events: auto;">${wp.id}</div>`,
          className: 'custom-wp-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }
    />
  );
};

const WaypointHandler = ({ active, addWaypoint, alt }: { active: boolean, addWaypoint: (lat: number, lng: number, alt: number) => void, alt: number }) => {
  useMapEvents({
    click(e) {
      if (active) {
        addWaypoint(e.latlng.lat, e.latlng.lng, alt);
      }
    }
  });
  return null;
};

const createDroneIcon = (heading: number) => {
  return L.divIcon({
    html: `
      <div style="transform: rotate(${heading}deg); transition: transform 0.2s ease-out; display: flex; align-items: center; justify-content: center;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 6px #0ea5e9);">
          <path d="M12 22a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"/>
          <path d="M12 8V2"/><path d="M12 2H9"/><path d="M12 2h3"/><path d="M19 12h3"/><path d="M5 12H2"/>
          <circle cx="12" cy="12" r="2" fill="#0ea5e9"/>
        </svg>
      </div>
    `,
    className: 'custom-drone-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface AIEvent {
  id: string;
  time: string;
  type: string;
  coordinate: [number, number];
  confidence: number;
}

interface BoundingBox {
  boxType: 'Yangin' | 'Insan';
  confidence: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

const AttitudeIndicator = ({ roll, pitch, isArmed }: { roll: number; pitch: number; isArmed: boolean }) => {
  const pitchPixels = pitch * 3;

  return (
    <div className="relative w-32 h-32 rounded-lg bg-sky-500 overflow-hidden shadow-inner border-2 border-slate-700">
      <svg width="100%" height="100%" viewBox="0 0 200 200" className="absolute inset-0">
        <defs>
          <clipPath id="hud-clip">
            <rect x="0" y="0" width="200" height="200" rx="8" />
          </clipPath>
          <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2c75ff" />
            <stop offset="100%" stopColor="#69a5e8" />
          </linearGradient>
          <linearGradient id="ground-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#849f2b" />
            <stop offset="100%" stopColor="#4a5c15" />
          </linearGradient>
        </defs>

        <g clipPath="url(#hud-clip)">
          {/* Rotating and Translating Horizon */}
          <g transform={`translate(100, 100) rotate(${-roll}) translate(0, ${pitchPixels})`}>
            {/* Sky Background */}
            <rect x="-400" y="-800" width="800" height="800" fill="url(#sky-gradient)" />
            {/* Ground Background */}
            <rect x="-400" y="0" width="800" height="800" fill="url(#ground-gradient)" />
            {/* Horizon Line */}
            <line x1="-400" y1="0" x2="400" y2="0" stroke="white" strokeWidth="2" />
            
            {/* Pitch Ladder */}
            {[...Array(9)].map((_, i) => {
              const p = (i + 1) * 10;
              const y = -p * 3;
              return (
                <g key={`up-${p}`}>
                  <line x1="-30" y1={y} x2="30" y2={y} stroke="white" strokeWidth="2" />
                  <text x="-35" y={y + 4} fill="white" fontSize="12" textAnchor="end" fontFamily="sans-serif" fontWeight="bold">{p}</text>
                  <text x="35" y={y + 4} fill="white" fontSize="12" textAnchor="start" fontFamily="sans-serif" fontWeight="bold">{p}</text>
                </g>
              );
            })}
            {[...Array(9)].map((_, i) => {
              const p = (i + 1) * 10;
              const y = p * 3;
              return (
                <g key={`down-${p}`}>
                  <line x1="-30" y1={y} x2="30" y2={y} stroke="white" strokeWidth="2" strokeDasharray="5 5" />
                  <text x="-35" y={y + 4} fill="white" fontSize="12" textAnchor="end" fontFamily="sans-serif" fontWeight="bold">{-p}</text>
                  <text x="35" y={y + 4} fill="white" fontSize="12" textAnchor="start" fontFamily="sans-serif" fontWeight="bold">{-p}</text>
                </g>
              );
            })}
          </g>

          {/* Static Overlays */}
          <g transform="translate(100, 100)">
            {/* Roll Scale */}
            <path d="M -70 -40 A 80 80 0 0 1 70 -40" fill="none" stroke="white" strokeWidth="2" />
            {[-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].map((angle) => {
               return (
                 <g key={`roll-${angle}`} transform={`rotate(${angle})`}>
                   <line x1="0" y1="-80" x2="0" y2={angle % 30 === 0 ? -70 : -75} stroke="white" strokeWidth="2" />
                   {angle === 0 && <polygon points="-5,-70 5,-70 0,-60" fill="white" />}
                 </g>
               )
            })}

            {/* Red Roll Pointer */}
            <g transform={`rotate(${-roll})`}>
               <polygon points="-5,-60 5,-60 0,-70" fill="red" />
            </g>

            {/* Center Crosshair (Red Airplane Symbol) */}
            <line x1="-40" y1="0" x2="-15" y2="0" stroke="red" strokeWidth="4" />
            <line x1="15" y1="0" x2="40" y2="0" stroke="red" strokeWidth="4" />
            <path d="M -10 5 L 0 -5 L 10 5" fill="none" stroke="red" strokeWidth="4" strokeLinejoin="round" />
            
            {/* Center Dot */}
            <circle cx="0" cy="0" r="2" fill="green" />

            {/* ARMED / DISARMED Text */}
            {!isArmed && (
              <text x="0" y="-15" fill="#ef4444" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="sans-serif" 
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.8))' }}
              >
                DISARMED
              </text>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};

export default function MissionControlDashboard() {
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(false);
  const [isCameraMain, setIsCameraMain] = useState<boolean>(false);
  
  const [telemetry, setTelemetry] = useState({
    altitude: 0, speed: 0, heading: 0, gpsCount: 0,
    opticalFlow: 'NO CONNECTION', battery: 0, flightMode: 'UNKNOWN', roll: 0, pitch: 0, missionState: 'STANDBY',
    lat: 40.982, lng: 28.743, verticalSpeed: 0, distToWp: 0, distToMav: 0,
    voltage: 0, current: 0
  });

  const [events, setEvents] = useState<AIEvent[]>([]);
  const [chartData, setChartData] = useState<{ time: string; altitude: number; battery: number }[]>([]);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<BoundingBox[]>([]);
  const [waypoints, setWaypoints] = useState<{id: string, lat: number, lng: number, alt: number}[]>([]);
  const [waypointMode, setWaypointMode] = useState<boolean>(false);
  const [defaultAlt, setDefaultAlt] = useState<number>(30);

  useEffect(() => {
    const socketUrl = 'ws://localhost:5000/telemetry';
    const ws = new WebSocket(socketUrl);

    ws.onmessage = (messageEvent) => {
      try {
        const incomingData = JSON.parse(messageEvent.data);
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        if (incomingData.dataType === 'LIVE_FRAME') {
          setLiveFrame(`data:image/jpeg;base64,${incomingData.frame}`);
          if (incomingData.boxes) {
            setDetectedBoxes(incomingData.boxes);
            
            incomingData.boxes.forEach((box: any) => {
              const displayType = box.boxType === 'Yangin' ? 'Fire' : 'Human';
              
              setEvents(prev => {
                if (prev.length > 0 && prev[0].type === displayType && prev[0].time === timeStr) {
                  return prev;
                }
                return [
                  { 
                    id: Date.now().toString() + Math.random(), 
                    time: timeStr, 
                    type: displayType, 
                    coordinate: box.boxType === 'Yangin' ? [40.982, 28.743] : [40.984, 28.745], 
                    confidence: box.confidence 
                  },
                  ...prev.slice(0, 4)
                ];
              });
            });
          } else {
            setDetectedBoxes([]);
          }
          return; 
        }

        setTelemetry(prev => {
          let updated = { ...prev };

          if (incomingData.type === 'ATTITUDE') {
            updated.roll = incomingData.roll * (180 / Math.PI);
            updated.pitch = incomingData.pitch * (180 / Math.PI);
            const translatedYaw = incomingData.yaw * (180 / Math.PI);
            updated.heading = translatedYaw < 0 ? translatedYaw + 360 : translatedYaw; 
          }
          else if (incomingData.type === 'VFR_HUD') {
            updated.speed = incomingData.groundspeed;
            updated.heading = incomingData.heading;
            updated.verticalSpeed = incomingData.climb;
          }
          else if (incomingData.type === 'GLOBAL_POSITION') {
            updated.altitude = incomingData.alt;
            updated.heading = incomingData.heading;
            if (incomingData.lat !== 0 && incomingData.lon !== 0) {
              updated.lat = incomingData.lat;
              updated.lng = incomingData.lon;
            }
          }
          else if (incomingData.type === 'STATUS') {
            if (incomingData.flightMode !== prev.flightMode) {
              if (incomingData.flightMode === 'AUTO') {
                updated.missionState = 'AUTO MISSION';
              } else if (incomingData.flightMode === 'RTL') {
                updated.missionState = 'RETURNING TO LAUNCH (RTL)';
              } else {
                if (prev.missionState !== '✅ MISSION COMPLETE!') {
                  updated.missionState = 'MANUAL / STANDBY';
                }
              }
            }
            updated.flightMode = incomingData.flightMode;
            setIsArmed(incomingData.armed);
          }
          else if (incomingData.type === 'BATTERY') {
            updated.battery = incomingData.battery;
            if (incomingData.voltage !== undefined) updated.voltage = incomingData.voltage;
            if (incomingData.current !== undefined) updated.current = incomingData.current;
          }
          else if (incomingData.type === 'GPS') {
            updated.gpsCount = incomingData.gpsCount;
          }
          else if (incomingData.type === 'NAV') {
            updated.distToWp = incomingData.wp_dist;
          }
          else if (incomingData.type === 'MISSION_DOWNLOADED') {
            setWaypoints(incomingData.waypoints.map((wp: any, index: number) => ({
              id: `N${index + 1}`,
              lat: wp.lat,
              lng: wp.lng,
              alt: wp.alt
            })));
          }
          else if (incomingData.type === 'MISSION_CURRENT') {
            if (prev.flightMode === 'AUTO') {
              updated.missionState = `TARGET WP: N${incomingData.seq}`;
            }
          }
          else if (incomingData.type === 'MISSION_COMPLETE') {
            updated.missionState = '✅ MISSION COMPLETE!';
          }

          updated.opticalFlow = incomingData.opticalFlow ?? prev.opticalFlow;

          if (['VFR_HUD', 'GLOBAL_POSITION', 'ATTITUDE', 'BATTERY'].includes(incomingData.type)) {
            setChartData(prevData => {
              const newPoint = { 
                time: timeStr, 
                altitude: updated.altitude, 
                battery: updated.battery > 0 ? updated.battery : 78
              };
              const updatedChart = [...prevData, newPoint];
              if (updatedChart.length > 15) updatedChart.shift();
              return updatedChart;
            });
          }

          return updated;
        });

      } catch (error) {
        console.error('Error decoding data packet:', error);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden select-none">
      
      {/* 1. ÜST ÇUBUK (TOP BAR) */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-bold tracking-wider text-sm text-slate-400">TULPAR-FF MPCC</h1>
          </div>
          <span className="text-xs bg-slate-800 px-2.5 py-1 rounded text-slate-400 font-mono">ROLE: OPERATOR</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`px-4 py-1.5 rounded border font-bold text-xs tracking-widest transition-all ${isArmed ? 'bg-red-600/20 border-red-500 text-red-500 animate-pulse' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
            {isArmed ? 'SYSTEM: ARMED' : 'SYSTEM: DISARMED'}
          </div>
          <div className="bg-slate-800/50 text-sky-400 px-3 py-1.5 rounded text-xs font-bold tracking-wider border border-slate-700">
            MODE: {telemetry.flightMode}
          </div>
        </div>

        <div className="flex items-center space-x-6 text-sm font-mono">
          <div className="flex items-center space-x-1.5 text-emerald-400"><Radio size={16} /><span>92% LTE (VPN)</span></div>
          <div className={`flex items-center space-x-1.5 font-bold ${telemetry.battery <= 20 && telemetry.battery > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
            <Battery size={16} />
            <span>{Math.round(telemetry.battery)}%</span>
            {(telemetry.voltage > 0 || telemetry.current > 0) && (
              <span className="text-xs text-slate-400 ml-2 font-normal">
                {telemetry.voltage > 0 ? `${telemetry.voltage.toFixed(1)}V ` : ''}
                {telemetry.current > 0 ? `${telemetry.current.toFixed(1)}A` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300"><Clock size={16} /><span>14:22 MIN</span></div>
        </div>
      </header>

      {/* ANA PANEL ALANI */}
      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        
        {/* SOL TELEMETRİ PANELI */}
        <aside className="col-span-2 flex flex-col space-y-2 overflow-y-auto">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">FLIGHT MODE</span>
            <div className={`text-2xl font-black font-mono tracking-wider ${telemetry.flightMode === 'AUTO' ? 'text-purple-400' : 'text-amber-400'}`}>{telemetry.flightMode}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Relative Alt</span>
            <div className="text-3xl font-bold font-mono tracking-tight text-sky-400">{telemetry.altitude.toFixed(1)} <span className="text-sm text-slate-500">m</span></div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">GroundSpeed (GS)</span>
            <div className="text-3xl font-bold font-mono tracking-tight text-emerald-400">{telemetry.speed.toFixed(1)} <span className="text-sm text-slate-500">m/s</span></div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Yaw (deg)</span>
            <div className="text-3xl font-bold font-mono tracking-tight text-amber-500">{Math.round(telemetry.heading)}°</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">GPS SATELLITES</span>
              <span className="text-lg font-bold font-mono text-slate-200">{telemetry.gpsCount} FIX</span>
            </div>
            <Crosshair className="text-emerald-500 animate-pulse" size={24} />
          </div>
        </aside>

        {/* MERKEZİ HARİTA (VEYA KAMERA İLE DEĞİŞTİRİLDİĞİNDE SAĞDA) */}
        <main className={`bg-slate-900 border border-slate-800 rounded-lg relative overflow-hidden group z-0 transition-all ${isCameraMain ? 'col-span-3 order-3 flex flex-col min-h-[300px]' : 'col-span-7 order-2'}`}>
          
          <button 
            onClick={() => setIsCameraMain(!isCameraMain)} 
            className="absolute top-4 right-4 z-[1000] bg-slate-800/90 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-2 border border-slate-600 backdrop-blur"
          >
            <ArrowRightLeft size={14} /> MAP / CAMERA
          </button>

          {/* Waypoint UI Overlays */}
          <div className="absolute top-4 left-14 z-[1000] flex flex-col space-y-2 pointer-events-auto">
            <button 
              onClick={() => setWaypointMode(!waypointMode)}
              className={`px-3 py-1.5 rounded font-bold text-xs shadow-lg transition-colors border ${waypointMode ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
            >
              {waypointMode ? '📍 WAYPOINT DRAW MODE ON' : '📍 DRAW WAYPOINTS'}
            </button>
            
            {waypointMode && (
              <div className="bg-slate-800/90 p-2 rounded border border-slate-700 shadow-lg backdrop-blur flex flex-col space-y-2 w-48">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Default Altitude (m):</span>
                  <input type="number" value={defaultAlt} onChange={e => setDefaultAlt(Number(e.target.value))} className="w-14 bg-slate-900 border border-slate-700 text-white text-xs px-1 py-0.5 rounded outline-none" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono border-b border-slate-700 pb-1 mb-1">
                  Click on the map to add points N1, N2...
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-sky-400">{waypoints.length} Points</span>
                  <button onClick={() => setWaypoints([])} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
                </div>
                <button 
                  onClick={() => {
                    const ws = new WebSocket('ws://localhost:5000/telemetry');
                    ws.onopen = () => {
                      ws.send(JSON.stringify({ type: 'UPLOAD_MISSION', waypoints }));
                      ws.close();
                      setWaypointMode(false);
                    };
                  }}
                  disabled={waypoints.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs py-1.5 rounded font-bold transition-colors cursor-pointer"
                >
                  🚀 UPLOAD MISSION TO DRONE
                </button>
                <button 
                  onClick={() => {
                    const ws = new WebSocket('ws://localhost:5000/telemetry');
                    ws.onopen = () => {
                      ws.send(JSON.stringify({ type: 'CLEAR_MISSION' }));
                      ws.close();
                      setWaypoints([]);
                    };
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white text-[10px] py-1.5 rounded font-bold transition-colors cursor-pointer mt-1"
                >
                  🗑️ CLEAR MEMORY
                </button>
                <button 
                  onClick={() => {
                    const ws = new WebSocket('ws://localhost:5000/telemetry');
                    ws.onopen = () => {
                      ws.send(JSON.stringify({ type: 'DOWNLOAD_MISSION' }));
                      ws.close();
                      setWaypointMode(false);
                    };
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1.5 rounded font-bold transition-colors cursor-pointer mt-1"
                >
                  📥 READ MISSION
                </button>
              </div>
            )}
          </div>

          <MapContainer center={[telemetry.lat, telemetry.lng]} zoom={16} className="w-full h-full cursor-crosshair">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapUpdater lat={telemetry.lat} lng={telemetry.lng} />
            <WaypointHandler active={waypointMode} alt={defaultAlt} addWaypoint={(lat, lng, alt) => setWaypoints(prev => [...prev, { id: `N${prev.length + 1}`, lat, lng, alt }])} />
            <Marker position={[telemetry.lat, telemetry.lng]} icon={createDroneIcon(telemetry.heading)} />
            
            {waypoints.length > 0 && (
              <Polyline positions={[[telemetry.lat, telemetry.lng], ...waypoints.map(wp => [wp.lat, wp.lng])]} color="#0ea5e9" weight={3} dashArray="5, 10" />
            )}
            
            {waypoints.map((wp) => (
              <DraggableMarker 
                key={wp.id} 
                wp={wp} 
                updateWaypoint={(id, lat, lng) => setWaypoints(prev => prev.map(p => p.id === id ? { ...p, lat, lng } : p))} 
              />
            ))}
          </MapContainer>
        </main>

        {/* SAĞ FAYDALI YÜK PANELİ (KAMERA BÜYÜTÜLDÜĞÜNDE ORTAYA GEÇER) */}
        <aside className={`flex flex-col space-y-2 overflow-hidden transition-all ${isCameraMain ? 'col-span-7 order-2' : 'col-span-3 order-3'}`}>
          <div className={`bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative flex flex-col transition-all ${isCameraMain ? 'flex-1' : 'h-80 shrink-0'}`}>
            <div className="p-2 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                LIVE PAYLOAD STREAM
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">720p 30FPS</span>
                <button onClick={() => setIsCameraMain(!isCameraMain)} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-0.5 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                  <ArrowRightLeft size={12} /> EXPAND
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-950 flex items-center justify-center relative overflow-hidden">
              {liveFrame ? (
                <>
                  <img src={liveFrame} alt="Payload Stream" className="w-full h-full object-cover z-0" />
                  {detectedBoxes.map((box: any, index: number) => {
                    const isFireMode = box.boxType === 'Yangin';
                    
                    return (
                      <div 
                        key={index}
                        className={`absolute border-2 rounded z-25 pointer-events-none ${
                          isFireMode 
                            ? 'border-red-500 bg-red-500/10 shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
                            : 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                        }`}
                        style={{
                          top: `${box.top}%`,
                          left: `${box.left}%`,
                          width: `${box.width}%`,
                          height: `${box.height}%`
                        }}
                      >
                        <span className={`absolute -top-5 left-0 text-white font-mono text-[9px] px-1 rounded font-bold tracking-wider ${
                          isFireMode ? 'bg-red-500' : 'bg-yellow-500'
                        }`}>
                          {isFireMode ? 'FIRE' : 'HUMAN'} %{Math.round(box.confidence * 100)}
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center text-xs text-slate-500 font-mono animate-pulse">📡 WAITING FOR VIDEO STREAM...</div>
              )}
            </div>
          </div>

          {/* YAPAY ZEKÂ LOG TABLOSU */}
          <div className={`bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col overflow-hidden transition-all ${isCameraMain ? 'h-24 shrink-0' : 'flex-1'}`}>
            <span className="text-xs font-bold tracking-wider text-slate-400 block mb-2">TARGET DETECTION LOG</span>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="text-slate-600 text-xs font-mono text-center mt-4">No detections yet.</div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-md flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${event.type === 'Fire' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className="text-xs font-bold text-slate-200">{event.type} Detected</span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1"><MapPin size={10} /> {event.coordinate.join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-500 block">{event.time}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">%{Math.round(event.confidence * 100)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ALT PANEL (YAPAY UFUK VE GRAFİK) */}
      <div className="grid grid-cols-12 gap-2 px-2 pb-2 h-36">
        
        {/* YAPAY UFUK KARTAL GÖZÜ */}
        <div className="col-span-4 bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-around">
          <div className="text-left font-mono text-xs">
            <span className="text-[10px] text-slate-400 block mb-1">ARTIFICIAL HORIZON (ATTITUDE)</span>
            <div className="text-sky-400">ROLL: <b>{telemetry.roll.toFixed(1)}°</b></div>
            <div className="text-amber-500 mt-0.5">PITCH: <b>{telemetry.pitch.toFixed(1)}°</b></div>
          </div>
          <AttitudeIndicator roll={telemetry.roll} pitch={telemetry.pitch} isArmed={isArmed} />
        </div>

        {/* TELEMETRİ GRAFİK ALANI */}
        <div className="col-span-4 bg-slate-900 border border-slate-800 p-2 rounded-lg flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">REAL-TIME TELEMETRY GRAPH</span>
            <span className="text-[9px] text-sky-400 font-mono font-bold">ALT (M)</span>
          </div>
          <div className="w-full h-24 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                <Line type="monotone" dataKey="altitude" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KRİTİK GÖREV YÖNETİM BUTONLARI (GÖZLEM) */}
        <div className="col-span-4 bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-center space-y-2">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest text-center">MISSION STATUS</div>
          <div className="flex space-x-2 h-full">
            <div className={`flex-1 flex items-center justify-center font-bold text-xs py-2 rounded border ${
              telemetry.missionState === '✅ MISSION COMPLETE!' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500 animate-pulse' :
              telemetry.flightMode === 'AUTO' ? 'bg-sky-900/40 text-sky-400 border-sky-800' :
              telemetry.flightMode === 'RTL' ? 'bg-purple-900/40 text-purple-400 border-purple-800' :
              'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              {telemetry.missionState}
            </div>
          </div>
        </div>
      </div>

      {/* EN ALT DURUM ÇUBUĞU */}
      <footer className="h-10 border-t border-slate-800 bg-slate-950 px-4 flex items-center justify-between text-xs font-mono text-slate-500">
        <div>
          <button 
            onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
            className={`px-3 py-0.5 rounded text-[11px] font-bold transition-all ${lowBandwidthMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
          >
            {lowBandwidthMode ? 'CRITICAL MODE: ACTIVE' : 'TRIGGER CRITICAL MODE'}
          </button>
        </div>
        <div>
          <span>MQTT / WS: <span className="text-emerald-500">45 pkt/sn</span></span>
        </div>
      </footer>

    </div>
  );
}
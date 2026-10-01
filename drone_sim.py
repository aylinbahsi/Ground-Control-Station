import asyncio
import json
import websockets
import random
import math

async def simulate_drone():
    # React arayüzünün bağlandığı asıl websocket ucu
    uri = "ws://localhost:5000/telemetry"
    
    print("📡 TULPAR MAVLink Simülatörü sunucuya bağlanıyor...")
    try:
        async with websockets.connect(uri) as ws:
            print("🔗 Simülatör başarıyla BAĞLANDI! Sahte Pixhawk (MAVLink) verisi akıyor...")
            print("Arayüzü kontrol edebilirsiniz. Kapatmak için CTRL+C yapın.")
            
            # Başlangıç değerleri
            altitude = 122.0
            speed = 14.5
            heading = 180
            battery = 95.0
            wp_dist = 450.0
            climb = 0.5
            lat = 40.982
            lon = 28.743
            
            while True:
                # Gerçekçi dalgalanmalar
                altitude += random.uniform(-0.4, 0.4)
                speed += random.uniform(-0.2, 0.2)
                heading = (heading + 1) % 360
                battery = max(0, battery - 0.05)
                wp_dist = max(0, wp_dist - 1.2)
                lat += 0.000001
                lon += 0.000001
                climb = random.uniform(-2.0, 2.0)
                
                # Yapay ufuk için (Radyan cinsinden)
                current_time = asyncio.get_event_loop().time()
                roll_rad = math.sin(current_time) * 0.2
                pitch_rad = math.cos(current_time) * 0.1
                yaw_rad = math.radians(heading)
                
                # Hıza göre otomatik uçuş modu değişimi simülasyonu
                flight_mode = "AUTO" if speed > 14.5 else "LOITER"

                # 1. ATTITUDE Paketi
                await ws.send(json.dumps({
                    "type": "ATTITUDE",
                    "roll": roll_rad,
                    "pitch": pitch_rad,
                    "yaw": yaw_rad
                }))
                
                # 2. VFR_HUD Paketi
                await ws.send(json.dumps({
                    "type": "VFR_HUD",
                    "heading": heading,
                    "alt": altitude,
                    "groundspeed": speed,
                    "climb": climb
                }))
                
                # 3. GLOBAL_POSITION Paketi
                await ws.send(json.dumps({
                    "type": "GLOBAL_POSITION",
                    "lat": lat,
                    "lon": lon,
                    "alt": altitude,
                    "heading": heading * 100
                }))

                # 4. STATUS Paketi
                await ws.send(json.dumps({
                    "type": "STATUS",
                    "armed": True,
                    "flightMode": flight_mode
                }))

                # 5. BATTERY Paketi
                await ws.send(json.dumps({
                    "type": "BATTERY",
                    "battery": battery
                }))

                # 6. GPS Paketi
                await ws.send(json.dumps({
                    "type": "GPS",
                    "gpsCount": random.randint(16, 22)
                }))

                # 7. NAV Paketi
                await ws.send(json.dumps({
                    "type": "NAV",
                    "wp_dist": wp_dist
                }))
                
                # Saniyede 10 paket simülasyonu (Gerçek Pixhawk hızı)
                await asyncio.sleep(0.1)
                
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(simulate_drone())
    except KeyboardInterrupt:
        print("\n👋 Simülasyon durduruldu.")
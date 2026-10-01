import asyncio
import websockets
import json
from pymavlink import mavutil
import time

async def listen_ws(ws, baglanti):
    async for message in ws:
        try:
            data = json.loads(message)
            if data.get('type') == 'UPLOAD_MISSION':
                waypoints = data.get('waypoints', [])
                if not waypoints:
                    continue
                
                print(f"Toplam {len(waypoints)} waypoint alindi, Pixhawk'a yukleniyor...")
                
                # Eger onceki gorev varsa temizle
                baglanti.mav.mission_clear_all_send(baglanti.target_system, baglanti.target_component)
                ack = baglanti.recv_match(type=['MISSION_ACK'], blocking=True, timeout=2)
                
                # Pixhawk'a kac tane waypoint gonderecegimizi soyluyoruz (seq 0 = Home, o yuzden +1)
                baglanti.mav.mission_count_send(
                    baglanti.target_system, 
                    baglanti.target_component, 
                    len(waypoints) + 1
                )
                
                # Sira ile waypointleri gonderiyoruz
                for i in range(len(waypoints) + 1):
                    msg = baglanti.recv_match(type=['MISSION_REQUEST_INT', 'MISSION_REQUEST'], blocking=True, timeout=5)
                    if not msg:
                        print(f"[{i}] Pixhawk'tan REQUEST mesaji gelmedi, zaman asimi!")
                        break
                    
                    if msg.seq == 0:
                        # seq=0 her zaman HOME noktasidir, dummy (bos) gonderiyoruz Pixhawk kendi evini korur
                        baglanti.mav.mission_item_int_send(
                            baglanti.target_system, baglanti.target_component, msg.seq,
                            mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
                            mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
                            0, 1, 0, 0, 0, 0, 0, 0, 0
                        )
                    else:
                        wp = waypoints[msg.seq - 1]
                        alt = float(wp['alt'])
                        lat = int(wp['lat'] * 1e7)
                        lng = int(wp['lng'] * 1e7)
                        
                        # MISSION_ITEM_INT paketi
                        baglanti.mav.mission_item_int_send(
                            baglanti.target_system, baglanti.target_component, msg.seq,
                            mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
                            mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
                            0, 1, 0, 0, 0, 0, lat, lng, alt
                        )
                        print(f"Waypoint {msg.seq} Pixhawk'a gonderildi: Lat={wp['lat']}, Lng={wp['lng']}, Alt={alt}m")
                
                # Yükleme sonu onay mesaji
                ack = baglanti.recv_match(type=['MISSION_ACK'], blocking=True, timeout=5)
                if ack and ack.type == mavutil.mavlink.MAV_MISSION_ACCEPTED:
                    print("Gorev (Mission) basariyla yuklendi!")
                else:
                    print("Gorev yukleme hatasi veya zaman asimi!")
                    
            elif data.get('type') == 'CLEAR_MISSION':
                print("Pixhawk'taki tum gorevler temizleniyor...")
                baglanti.mav.mission_clear_all_send(baglanti.target_system, baglanti.target_component)
                
            elif data.get('type') == 'DOWNLOAD_MISSION':
                print("Pixhawk'tan gorevler (waypoints) talep ediliyor...")
                baglanti.mav.mission_request_list_send(baglanti.target_system, baglanti.target_component)
                
                msg = baglanti.recv_match(type=['MISSION_COUNT'], blocking=True, timeout=5)
                if not msg:
                    print("Pixhawk MISSION_COUNT gondermedi, zaman asimi.")
                    continue
                
                count = msg.count
                print(f"Pixhawk'ta {count} adet gorev noktasi bulundu (0. satir Home dahildir).")
                
                downloaded_waypoints = []
                # Pixhawk'ta 0. satir Home oldugu icin asil ucus plani 1. satirdan baslar
                for i in range(1, count):
                    baglanti.mav.mission_request_int_send(baglanti.target_system, baglanti.target_component, i)
                    wp_msg = baglanti.recv_match(type=['MISSION_ITEM_INT'], blocking=True, timeout=5)
                    if not wp_msg:
                        print(f"[{i}] Pixhawk'tan WAYPOINT verisi gelmedi, zaman asimi.")
                        break
                    
                    if wp_msg.command == mavutil.mavlink.MAV_CMD_NAV_WAYPOINT:
                        downloaded_waypoints.append({
                            'lat': wp_msg.x / 1e7,
                            'lng': wp_msg.y / 1e7,
                            'alt': wp_msg.z
                        })
                
                # React'e indirilen waypointleri gonder
                response = {
                    "type": "MISSION_DOWNLOADED",
                    "waypoints": downloaded_waypoints
                }
                try:
                    await ws.send(json.dumps(response))
                    print("Indirilen waypointler basariyla TULPAR arayuzune aktarildi.")
                except Exception as e:
                    print(f"Indirilen waypointleri arayuze gonderirken hata: {e}")
        except Exception as e:
            print(f"WebSocket mesaj isleme hatasi: {e}")

async def send_telemetry(ws, baglanti):
    last_heartbeat_time = 0
    while True:
        # Keep UDP alive by sending GCS heartbeat
        current_time = time.time()
        if current_time - last_heartbeat_time > 1.0:
            try:
                baglanti.mav.heartbeat_send(
                    mavutil.mavlink.MAV_TYPE_GCS,
                    mavutil.mavlink.MAV_AUTOPILOT_INVALID,
                    0, 0, 0
                )
            except Exception:
                pass
            last_heartbeat_time = current_time
            
        try:
            msg = baglanti.recv_match(blocking=False)
        except ConnectionResetError:
            # Windows'ta gonderilen UDP paketi ulasmazsa (ICMP unreachable) recv_match 10054 firlatir. Yoksay.
            await asyncio.sleep(0.1)
            continue
            
        if not msg:
            await asyncio.sleep(0.01)
            continue
            
        msg_type = msg.get_type()
        telemetri_verisi = None
        
        # 1. JİROSKOP / YAPAY UFUK VERİSİ
        if msg_type == 'ATTITUDE':
            telemetri_verisi = {
                "type": "ATTITUDE",
                "roll": msg.roll,
                "pitch": msg.pitch,
                "yaw": msg.yaw
            }
            
        # 2. HIZ VE ALTOMETRE VERİSİ
        elif msg_type == 'VFR_HUD':
            telemetri_verisi = {
                "type": "VFR_HUD",
                "heading": msg.heading,
                "alt": msg.alt,
                "groundspeed": msg.groundspeed,
                "climb": msg.climb
            }
            
        # 3. KÜRESEL KONUM VE İRTİFA
        elif msg_type == 'GLOBAL_POSITION_INT':
            telemetri_verisi = {
                "type": "GLOBAL_POSITION",
                "heading": msg.hdg / 100.0 if msg.hdg != 65535 else 0,
                "alt": msg.relative_alt / 1000.0,
                "lat": msg.lat / 1e7,
                "lon": msg.lon / 1e7
            }
            
        # 4. GERÇEK UÇUŞ MODU VE DURUMU
        elif msg_type == 'HEARTBEAT':
            telemetri_verisi = {
                "type": "STATUS",
                "armed": (msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED) != 0,
                "flightMode": baglanti.flightmode or "UNKNOWN"
            }
            
        # 5. PİL VE SİSTEM DURUMU
        elif msg_type == 'SYS_STATUS':
            telemetri_verisi = {
                "type": "BATTERY",
                "battery": msg.battery_remaining,
                "voltage": msg.voltage_battery / 1000.0,
                "current": msg.current_battery / 100.0 if msg.current_battery != -1 else 0.0
            }
            
        # 6. GPS UYDU SAYISI
        elif msg_type == 'GPS_RAW_INT':
            telemetri_verisi = {
                "type": "GPS",
                "gpsCount": msg.satellites_visible
            }
            
        # 7. WAYPOINT MESAFESİ
        elif msg_type == 'NAV_CONTROLLER_OUTPUT':
            telemetri_verisi = {
                "type": "NAV",
                "wp_dist": msg.wp_dist
            }
            
        # 8. CURRENT WAYPOINT VE STATUSTEXT
        elif msg_type == 'MISSION_CURRENT':
            telemetri_verisi = {
                "type": "MISSION_CURRENT",
                "seq": msg.seq
            }
        elif msg_type == 'STATUSTEXT':
            text = msg.text
            if "Mission Complete" in text or "mission complete" in text.lower() or "Reached command" in text:
                telemetri_verisi = {
                    "type": "MISSION_COMPLETE",
                    "text": text
                }

        if telemetri_verisi:
            try:
                await ws.send(json.dumps(telemetri_verisi))
            except Exception:
                break

async def main():
    sunucu_adresi = "ws://localhost:5000/telemetry"
    
    print("Mission Planner'dan UDP:14551 firlatmasi bekleniyor...")
    # source_system=255 ile Yer Istasyonu (GCS) kimligi veriyoruz, ghost drone sorununu cozuyoruz
    baglanti = mavutil.mavlink_connection('udpin:localhost:14551', source_system=255)
    
    baglanti.wait_heartbeat()
    print("Pixhawk verisi kopruye ulasti!")

    async with websockets.connect(sunucu_adresi) as ws:
        print("React arayuzunun sunucusuna baglandik!")
        
        # Hem telemetri gonderme, hem de arayuzden gelen komutlari (waypoint) dinleme ayni anda calissin
        await asyncio.gather(
            listen_ws(ws, baglanti),
            send_telemetry(ws, baglanti)
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBaglanti kapatildi.")
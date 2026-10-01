import cv2
import json
import base64
from ultralytics import YOLO
import websocket

def main():
    print("🧠 TULPAR-FF Yapay Zeka Modelleri Yükleniyor...")
    fire_model = YOLO("fassd.pt")
    human_model = YOLO("c2a.pt")
    print("✓ Modeller başarıyla yüklendi!")

    # -------------------------------------------------------------
    # 🎯 RASPBERRY PI KAMERA BAĞLANTI AYARI
    # Aşağıdaki IP adresini Raspberry Pi'nizin gerçek IP'si ile değiştirin!
    PI_IP_ADRESI = "192.168.1.125"  # <-- Buraya Pi'nin IP'sini yazın
    pi_video_url = f"tcp://{PI_IP_ADRESI}:8554"
    
    print(f"📡 Raspberry Pi Kamerasına Bağlanılıyor: {pi_video_url}")
    cap = cv2.VideoCapture(pi_video_url)
    # -------------------------------------------------------------

    if not cap.isOpened():
        print("❌ Hata: Raspberry Pi kamera yayınına erişilemedi!")
        print("💡 Lütfen Pi'de libcamera-vid komutunun çalıştığından ve IP adresinin doğru olduğundan emin olun.")
        return

    W_WIDTH, W_HEIGHT = 640, 480
    ws = websocket.create_connection("ws://localhost:5000/telemetry")
    print("🚀 RASPBERRY PI OTONOM ANALİZ MOTORU AKTİF!")
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: 
            print("⚠️ Canlı yayın koptu veya kare alınamıyor...")
            break

        frame = cv2.resize(frame, (W_WIDTH, W_HEIGHT))
        react_boxes = []

        # 1. YANGIN TESPİTİ (Hassas Eşik: 0.25)
        fire_results = fire_model(frame, conf=0.25, imgsz=640, verbose=False)
        for result in fire_results:
            if result.boxes:
                for box in result.boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    class_name = fire_model.names[cls].lower()

                    # Sadece yangın veya ateş ile ilgili sınıfları kabul et (duman vb. varsa yoksay)
                    if len(fire_model.names) > 1 and not any(k in class_name for k in ["fire", "yang", "alev", "flame"]):
                        continue

                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    
                    top_pct = int((y1 / W_HEIGHT) * 100)
                    left_pct = int((x1 / W_WIDTH) * 100)
                    width_pct = int(((x2 - x1) / W_WIDTH) * 100)
                    height_pct = int(((y2 - y1) / W_HEIGHT) * 100)

                    if width_pct > 70 or height_pct > 70: continue

                    react_boxes.append({
                        "boxType": "Yangin",
                        "confidence": int(conf * 100),
                        "top": top_pct,
                        "left": left_pct,
                        "width": width_pct,
                        "height": height_pct
                    })
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 2)

        # 2. İNSAN TESPİTİ (Eşik: 0.45)
        human_results = human_model(frame, conf=0.45, imgsz=640, verbose=False)
        for result in human_results:
            if result.boxes:
                for box in result.boxes:
                    cls = int(box.cls[0])
                    class_name = human_model.names[cls].lower()

                    # İnsan modeli COCO vb. genelse araba vb. bulduğunda 'İnsan' demesini engelle
                    if len(human_model.names) > 1 and not any(k in class_name for k in ["person", "insan", "human"]):
                        continue

                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    
                    react_boxes.append({
                        "boxType": "Insan",
                        "confidence": int(conf * 100),
                        "top": int((y1 / W_HEIGHT) * 100),
                        "left": int((x1 / W_WIDTH) * 100),
                        "width": int(((x2 - x1) / W_WIDTH) * 100),
                        "height": int(((y2 - y1) / W_HEIGHT) * 100)
                    })
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 255), 2)

        # Görüntüyü sıkıştırıp paketleme
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        payload = {
            "dataType": "LIVE_FRAME",
            "frame": jpg_as_text,
            "boxes": react_boxes
        }

        try:
            ws.send(json.dumps(payload))
        except:
            break

        cv2.imshow("TULPAR-FF Drone Canlı Analiz", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    ws.close()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
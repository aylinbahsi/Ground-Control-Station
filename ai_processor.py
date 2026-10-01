import cv2
from ultralytics import YOLO # YOLOv8 kütüphanesi
import requests # Arayüze veya sunucuya log fırlatmak için

# 1. Kendi özel veri setimizle eğittiğimiz YOLOv8 modelini yüklüyoruz
# Modelimiz: Yangın (0), İnsan (1) ve Çadır (2) sınıflarını tanıyor
model = YOLO("best.pt") 

# 2. MediaMTX üzerindeki drone kamerasının canlı video akışına bağlanıyoruz
video_url = "rtsp://localhost:8554/live/tulpar_payload"
cap = cv2.VideoCapture(video_url)

print("🧠 TULPAR-FF Yapay Zeka Motoru Başlatıldı. Görüntü işleniyor...")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # 3. YOLOv8 modelini gelen anlık kare üzerinde çalıştırıyoruz
    results = model(frame, conf=0.5) # %50 güvenilirlik eşiği

    for result in results:
        boxes = result.boxes
        for box in boxes:
            # Tespit edilen nesnenin koordinatlarını ve sınıfını alıyoruz
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            # Sınıf isimlerini eşleştiriyoruz
            class_names = ["Yangın", "İnsan", "Çadır"]
            detected_type = class_names[cls]

            # 4. KRİTİK ADIM: Eğer tehlikeli bir nesne tespit edilirse 
            # Sunucu üzerinden React arayüzündeki "YAPAY ZEKÂ OLAY GÜNLÜĞÜ"ne anlık bildirim fırlatıyoruz
            if conf > 0.70: # %70 üzeri kesinlikte alarm tetikle
                payload = {
                    "type": detected_type,
                    "confidence": int(conf * 100),
                    "coordinate": [40.982, 28.743] # Drone'un o anki GPS konumu
                }
                # Sunucumuza POST isteği atarak arayüzdeki sağ panele log düşürüyoruz
                try:
                    requests.post("http://localhost:5000/api/ai-event", json=payload)
                except:
                    pass

    # 5. Modelin çizdiği kutulu görüntüyü ekrana basıyoruz
    # Sahada bu işlenmiş görüntü tekrar sisteme verilerek React içerisindeki iframe'e yansıtılır
    annotated_frame = results[0].plot()
    cv2.imshow("TULPAR-FF AI Canlı Analiz", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
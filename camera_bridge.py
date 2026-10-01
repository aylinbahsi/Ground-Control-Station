import cv2
import subprocess
import sys
import time

def start_camera_stream():
    # 1. Bilgisayarın varsayılan web kamerasını açıyoruz
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) # Windows için doğrudan DirectShow sürücüsü ile hızlı açış
    
    if not cap.isOpened():
        print("❌ Hata: Bilgisayarın web kamerası bulunamadı!")
        return

    # Çözünürlüğü ve FPS'i optimize ediyoruz
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    rtsp_url = "rtsp://localhost:8554/live/tulpar_payload"
    
    print("📡 TULPAR-FF Kamera Köprüsü Başlatılıyor...")
    print(f"🎥 Canlı yayın adresi: {rtsp_url}")
    print("💡 Kapatmak için terminalde CTRL + C yapabilirsiniz.")

    # Windows'ta FFmpeg'e ihtiyaç duymadan, OpenCV'nin kendi entegre API'si üzerinden 
    # MediaMTX sunucusuna RTSP akışını doğrudan paketleyip gönderiyoruz.
    out = cv2.VideoWriter(
        rtsp_url, 
        cv2.CAP_FFMPEG, 
        cv2.VideoWriter_fourcc(*'X264'), 
        30.0, 
        (640, 480)
    )

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("❌ Kameradan kare okunamıyor.")
                time.sleep(0.1)
                continue

            # Kareyi canlı olarak MediaMTX sunucusunun portuna bas
            out.write(frame)
            
            # Sunucuyu yormamak ve senkronizasyon için minik bir gecikme
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    except KeyboardInterrupt:
        print("\n🛑 Kamera yayını durduruldu.")
    finally:
        cap.release()
        out.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    start_camera_stream()
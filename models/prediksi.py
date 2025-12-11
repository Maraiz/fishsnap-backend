# predict.py
import sys
import json
from ultralytics import YOLO
import os
import numpy as np
from PIL import Image

# Load model YOLO
model_path = os.path.join(os.path.dirname(__file__), 'best.pt')
model = YOLO(model_path)

# Load fish info (opsional, jika masih ingin menyertakan informasi tambahan)
info_path = os.path.join(os.path.dirname(__file__), 'fish_info.json')
try:
    with open(info_path, 'r') as f:
        fish_info = json.load(f)
except:
    fish_info = {}

if __name__ == "__main__":
    try:
        if len(sys.argv) > 2 and sys.argv[1] == "image":
            image_path = sys.argv[2]
            conf_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3

            # Lakukan prediksi menggunakan YOLO
            results = model.predict(image_path, conf=conf_threshold, verbose=False)

            output = []
            for r in results:
                boxes = r.boxes.xyxy
                confs = r.boxes.conf
                classes = r.boxes.cls

                for box, conf, cls in zip(boxes, confs, classes):
                    if conf >= conf_threshold:
                        x1, y1, x2, y2 = map(float, box)
                        predicted_label = r.names[int(cls)]
                        output.append({
                            "class": predicted_label,
                            "confidence": float(conf),
                            "box": [x1, y1, x2, y2]
                        })

            # Jika tidak ada deteksi
            if not output:
                result = {
                    "status": "success",
                    "model_type": "image",
                    "predicted_class": None,
                    "confidence": 0.0,
                    "top_3_predictions": [],
                    "info": {
                        "nama_indonesia": "Tidak diketahui",
                        "habitat": "Tidak diketahui",
                        "konsumsi": "Tidak diketahui"
                    }
                }
            else:
                # Ambil prediksi dengan confidence tertinggi
                top_prediction = max(output, key=lambda x: x["confidence"])
                predicted_label = top_prediction["class"]
                predicted_conf = top_prediction["confidence"]

                # Top 3 prediksi (jika ada lebih dari satu deteksi)
                top_3 = sorted(output, key=lambda x: x["confidence"], reverse=True)[:3]
                top_3_predictions = [
                    {"class": pred["class"], "confidence": pred["confidence"]}
                    for pred in top_3
                ]

                # Ambil info tambahan dari fish_info.json
                extra_info = fish_info.get(predicted_label, {
                    "nama_indonesia": "Tidak diketahui",
                    "habitat": "Tidak diketahui",
                    "konsumsi": "Tidak diketahui"
                })

                result = {
                    "status": "success",
                    "model_type": "image",
                    "predicted_class": predicted_label,
                    "confidence": float(predicted_conf),
                    "top_3_predictions": top_3_predictions,
                    "info": extra_info,
                    "boxes": [pred["box"] for pred in output]  # Tambahkan bounding box
                }

            print(json.dumps(result))

        else:
            # Jika bukan prediksi gambar, kembalikan error
            raise ValueError("Hanya prediksi gambar yang didukung dengan YOLO")

    except Exception as e:
        error_result = {
            "error": str(e),
            "status": "error"
        }
        print(json.dumps(error_result))
        sys.exit(1)
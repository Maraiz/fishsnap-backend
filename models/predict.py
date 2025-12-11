# predict.py
import sys
import json
from ultralytics import YOLO
import os

# Load model YOLO (object detection)
model_path = os.path.join(os.path.dirname(__file__), 'best1.pt')
model = YOLO(model_path)

# Load fish info (opsional)
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

            # Prediksi (deteksi objek)
            results = model.predict(image_path, verbose=False)

            output = []
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        cls_id = int(box.cls)
                        conf = float(box.conf)
                        label = r.names[cls_id]
                        if conf >= conf_threshold:
                            output.append({
                                "class": label,
                                "confidence": conf
                            })

            if not output:
                result = {
                    "status": "success",
                    "model_type": "detection",
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
                # Ambil prediksi paling tinggi
                top_prediction = max(output, key=lambda x: x["confidence"])
                predicted_label = top_prediction["class"]
                predicted_conf = top_prediction["confidence"]

                # Top-3 prediksi
                top_3 = sorted(output, key=lambda x: x["confidence"], reverse=True)[:3]

                # Info tambahan
                extra_info = fish_info.get(predicted_label, {
                    "nama_indonesia": "Tidak diketahui",
                    "habitat": "Tidak diketahui",
                    "konsumsi": "Tidak diketahui"
                })

                result = {
                    "status": "success",
                    "model_type": "detection",
                    "predicted_class": predicted_label,
                    "confidence": predicted_conf,
                    "top_3_predictions": top_3,
                    "info": extra_info
                }

            print(json.dumps(result))

        else:
            raise ValueError("Gunakan argumen: image <path_gambar> [conf_threshold]")

    except Exception as e:
        error_result = {
            "error": str(e),
            "status": "error"
        }
        print(json.dumps(error_result))
        sys.exit(1)

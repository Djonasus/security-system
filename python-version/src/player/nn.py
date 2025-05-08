from os import path
from ultralytics import YOLO 
from PIL import Image

model_name = "yolov8n.pt"
current_dir = path.abspath(__file__)
project_path = path.abspath(path.join(current_dir, '../../..'))
model_path = path.join(project_path, 'models', model_name)

model = YOLO(model_path)
names = []
names = model.module.names if hasattr(model, 'module') else model.names
names[0] = 'человек'
names[1] = 'велосипед'
names[2] = 'машина'
names[3] = 'мотоцикл'
names[16] = 'собака'

allowed_labels = ['человек', 'машина', 'мотоцикл', 'велосипед', 'собака']

def is_filtered_label(label):
    return label in allowed_labels

def configure_output(results):
    output = []
    for result in results:
        boxes = result.boxes.xyxy
        categories = result.boxes.cls
        scores = result.boxes.conf
        for box, category, score in zip(boxes, categories, scores):
            label = names.get(category.item())
            if is_filtered_label(label):
                x1, y1, x2, y2 = [int(c.item()) for c in box]
                w, h = x2-x1, y2-y1
                detection = ((x1, y1, w, h), label, score.item())
                output.append(detection)
    return output

def detect_objects(frame):
    image = Image.fromarray(frame)

    results = model.predict(image, imgsz=256, stream = False)
    return configure_output(results)

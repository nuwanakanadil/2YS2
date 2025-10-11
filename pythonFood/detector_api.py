from flask import Flask, request, jsonify
import torch
from torchvision import transforms, models
from PIL import Image
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load class names
class_names = sorted(os.listdir("dataset"))

# Load trained model
model = models.efficientnet_b0(pretrained=False)
num_classes = len(class_names)
model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, num_classes)
model.load_state_dict(torch.load("food_model.pth", map_location=torch.device('cpu')))
model.eval()

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# Predict function
def predict_image(image_path):
    image = Image.open(image_path).convert("RGB")
    input_tensor = transform(image).unsqueeze(0)
    with torch.no_grad():
        outputs = model(input_tensor)
        _, predicted = torch.max(outputs, 1)
        return class_names[predicted.item()]

@app.route("/predict", methods=["POST"])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image file"}), 400

    image = request.files['image']
    image_path = f"temp/{image.filename}"
    image.save(image_path)

    prediction = predict_image(image_path)

    os.remove(image_path)  # cleanup temp file
    return jsonify({"prediction": prediction})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)

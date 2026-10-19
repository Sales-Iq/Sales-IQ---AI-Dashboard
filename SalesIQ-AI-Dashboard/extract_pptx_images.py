import os
from pptx import Presentation

pptx_path = r"C:\Users\karan\Downloads\SalesIQ_Final_Presentation_1.pptx"
prs = Presentation(pptx_path)

img_dir = r"C:\Users\karan\Desktop\transfer 31_8_26\SalesIQ-AI-Dashboard-Admin-Staff-Realtime-Charts\SalesIQ-AI-Dashboard-Admin-Staff-Realtime-Charts\SalesIQ-AI-Dashboard\extracted_images"
os.makedirs(img_dir, exist_ok=True)

image_count = 0
slide_images = []

for idx, slide in enumerate(prs.slides):
    for shape in slide.shapes:
        if shape.shape_type == 13: # Picture
            image = shape.image
            image_bytes = image.blob
            ext = image.ext
            filename = f"slide_{idx+1}_{image_count+1}.{ext}"
            filepath = os.path.join(img_dir, filename)
            with open(filepath, "wb") as f:
                f.write(image_bytes)
            image_count += 1
            slide_images.append((idx+1, filename, len(image_bytes)))

print(f"Extracted {image_count} images:")
for slide_no, fn, size in slide_images:
    print(f"  Slide {slide_no}: {fn} ({size} bytes)")


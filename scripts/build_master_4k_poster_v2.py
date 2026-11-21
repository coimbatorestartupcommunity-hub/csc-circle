import cv2
import numpy as np
from PIL import Image
import os

print("--- 1. Base Image Preparation ---")
ubd_path = '/Users/vikash/.gemini/antigravity-cli/brain/628e1d36-713b-4fac-9ebe-f44971074f4a/user-base-design.jpg'
ubd = Image.open(ubd_path).convert('RGB')
arr_ubd = np.array(ubd)

# Seamlessly erase divider line (y=1536:1546)
arr_ubd[1536:1546, 40:1560, :] = arr_ubd[1506:1516, 40:1560, :]

# Seamlessly erase old top-left text block & stray mark (y=490 to 572, x=40 to 450)
shift = 118
arr_ubd[490:572, 40:450, :] = arr_ubd[490-shift:572-shift, 40:450, :]

# Seamlessly erase old blurry logo area (x=40..205, y=85..235)
# Shift clean grid from y=240..390
arr_ubd[85:235, 40:205, :] = arr_ubd[85+118:235+118, 40:205, :]

# Seamlessly erase bottom paragraph to render pristine 4K typography
for y in range(1640, 1915):
    margin_val = arr_ubd[y, 50:70, :].mean(axis=(0,1))
    ref_row = arr_ubd[1935, :, :].astype(float)
    ref_base = ref_row[50:70, :].mean(axis=(0,1))
    reconstructed = np.clip(margin_val + (ref_row - ref_base), 0, 255).astype(np.uint8)
    arr_ubd[y, 140:1460, :] = reconstructed[140:1460, :]

clean_base_1600 = Image.fromarray(arr_ubd)
base_4k = clean_base_1600.resize((3200, 4000), Image.Resampling.LANCZOS)
arr_base_4k = np.array(base_4k)

print("--- 2. High-Res Portrait Compositing ---")
p_high = cv2.imread('/tmp/new_portrait.png') # (3566, 2680, 3)

scale_4k = 0.321172658 * 2.0
tx_4k = 335.943367 * 2.0
ty_4k = 320.919719 * 2.0

M_4k = np.array([
    [scale_4k, 0.0, tx_4k],
    [0.0, scale_4k, ty_4k]
])
p_warped_4k = cv2.warpAffine(p_high, M_4k, (3200, 4000), flags=cv2.INTER_LANCZOS4)

arch_mask_1600 = cv2.imread('/tmp/arch_mask_filled.png', cv2.IMREAD_GRAYSCALE)
arch_mask_4k = cv2.resize(arch_mask_1600, (3200, 4000), interpolation=cv2.INTER_LINEAR)

ubd_4k = cv2.resize(cv2.imread(ubd_path), (3200, 4000), interpolation=cv2.INTER_LANCZOS4)
diff_4k = np.abs(ubd_4k.astype(float) - p_warped_4k.astype(float)).mean(axis=2)
portrait_area = (diff_4k < 35) & (arch_mask_4k > 128)

mask_float = cv2.GaussianBlur(portrait_area.astype(np.float32), (5, 5), 1.5)
mask_3d = np.repeat(mask_float[:, :, np.newaxis], 3, axis=2)

final_cv = (p_warped_4k.astype(float) * mask_3d + arr_base_4k[:, :, ::-1].astype(float) * (1.0 - mask_3d)).clip(0, 255).astype(np.uint8)
final_img = Image.fromarray(cv2.cvtColor(final_cv, cv2.COLOR_BGR2RGB))

print("--- 3. Perfect Corner Placement for Coimbatore Startup Community Logo ---")
logo_raw = Image.open('/Users/vikash/.gemini/antigravity-cli/brain/4b15f822-1ac4-4304-8a38-597135e3101f/.user_uploaded/uploaded_media_1_1794848863953.png').convert('RGBA')
arr_logo = np.array(logo_raw)

# Smooth circle mask up to radius 990 (leaves all text intact)
Y, X = np.ogrid[:2000, :2000]
dist = np.sqrt((X - 1000)**2 + (Y - 1000)**2)
circle_mask = np.clip((990 - dist) / 2.0, 0, 1)

clean_logo = np.zeros((2000, 2000, 4), dtype=np.uint8)
clean_logo[:, :, :3] = 255 # pure white background circle
clean_logo[:, :, 3] = (circle_mask * 255).astype(np.uint8)

# Dark artwork inside the circle
dark_pixels = (arr_logo[:, :, 0] < 50) & (arr_logo[:, :, 1] < 50) & (arr_logo[:, :, 2] < 50) & (dist < 975)
clean_logo[dark_pixels, :3] = arr_logo[dark_pixels, :3]

# In 4K, exact position matching original UBD corner: loc=(96, 180), size=(294, 294)
logo_img = Image.fromarray(clean_logo)
logo_4k = logo_img.resize((294, 294), Image.Resampling.LANCZOS)
final_img.paste(logo_4k, (96, 180), logo_4k)
print("Logo placed with exact alignment at (96, 180), size 294x294")

final_img.save('/tmp/master_4k_base_v2.png')
print("Base image saved to /tmp/master_4k_base_v2.png")

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import shutil

print("--- Step 1: Loading assets ---")
# 1. Base design
ubd_path = '/Users/vikash/.gemini/antigravity-cli/brain/628e1d36-713b-4fac-9ebe-f44971074f4a/user-base-design.jpg'
ubd = Image.open(ubd_path).convert('RGB')
arr_ubd = np.array(ubd)

# 2. Seamlessly erase divider line (y=1536:1546)
arr_ubd[1536:1546, 40:1560, :] = arr_ubd[1506:1516, 40:1560, :]

# 3. Seamlessly erase old top-left text block & stray mark (y=490 to 572, x=40 to 450)
shift = 118
arr_ubd[490:572, 40:450, :] = arr_ubd[490-shift:572-shift, 40:450, :]

# 4. Seamlessly erase old blurry logo area (x=40..200, y=120..215)
# Use clean grid from y=238..333 shifted
# Vertical lines align at same x. Horizontal line period is 118px (4 grid units).
# y=120..215 -> source from y=120+118 : 215+118 = y=238..333
arr_ubd[120:215, 40:200, :] = arr_ubd[120+118:215+118, 40:200, :]

# 5. Seamlessly erase bottom paragraph to render 4K crisp typography
for y in range(1640, 1915):
    margin_val = arr_ubd[y, 50:70, :].mean(axis=(0,1))
    ref_row = arr_ubd[1935, :, :].astype(float)
    ref_base = ref_row[50:70, :].mean(axis=(0,1))
    reconstructed = np.clip(margin_val + (ref_row - ref_base), 0, 255).astype(np.uint8)
    arr_ubd[y, 140:1460, :] = reconstructed[140:1460, :]

clean_base_1600 = Image.fromarray(arr_ubd)

# Scale clean base to 4K (3200 x 4000)
base_4k = clean_base_1600.resize((3200, 4000), Image.Resampling.LANCZOS)
arr_base_4k = np.array(base_4k)

print("--- Step 2: Warping & Compositing High-Res Portrait into Arch ---")
# High-res portrait from heic conversion
p_high = cv2.imread('/tmp/new_portrait.png') # shape (3566, 2680, 3)

# 4K affine transform
scale_4k = 0.321172658 * 2.0
tx_4k = 335.943367 * 2.0
ty_4k = 320.919719 * 2.0

M_4k = np.array([
    [scale_4k, 0.0, tx_4k],
    [0.0, scale_4k, ty_4k]
])
p_warped_4k = cv2.warpAffine(p_high, M_4k, (3200, 4000), flags=cv2.INTER_LANCZOS4)

# Arch mask: scale 1600x2000 mask to 4K
arch_mask_1600 = cv2.imread('/tmp/arch_mask_filled.png', cv2.IMREAD_GRAYSCALE)
arch_mask_4k = cv2.resize(arch_mask_1600, (3200, 4000), interpolation=cv2.INTER_LINEAR)

# In ubd scaled to 4K:
ubd_4k = cv2.resize(cv2.imread(ubd_path), (3200, 4000), interpolation=cv2.INTER_LANCZOS4)

# Detect foreground elements inside arch in ubd_4k (like curved text 'CHIEF TECHNOLOGY OFFICER' and tick marks)
diff_4k = np.abs(ubd_4k.astype(float) - p_warped_4k.astype(float)).mean(axis=2)
# Pixels that are part of the portrait (diff < 35 and inside arch_mask)
portrait_area = (diff_4k < 35) & (arch_mask_4k > 128)

# Smooth mask with slight Gaussian blur for flawless seamless blending
mask_float = cv2.GaussianBlur(portrait_area.astype(np.float32), (5, 5), 1.5)
mask_3d = np.repeat(mask_float[:, :, np.newaxis], 3, axis=2)

# Blend portrait into 4K base
final_cv = (p_warped_4k.astype(float) * mask_3d + arr_base_4k[:, :, ::-1].astype(float) * (1.0 - mask_3d)).clip(0, 255).astype(np.uint8)
final_img = Image.fromarray(cv2.cvtColor(final_cv, cv2.COLOR_BGR2RGB))

print("--- Step 3: Compositing Clean Coimbatore Startup Community Logo ---")
logo_raw = Image.open('/Users/vikash/.gemini/antigravity-cli/brain/4b15f822-1ac4-4304-8a38-597135e3101f/.user_uploaded/uploaded_media_1_1794848863953.png')
# Clean the logo edge: inside radius < 980 of 2000x2000
arr_logo = np.array(logo_raw)
Y, X = np.ogrid[:2000, :2000]
dist = np.sqrt((X - 1000)**2 + (Y - 1000)**2)

# Create an anti-aliased circular alpha mask
circle_alpha = np.clip((985 - dist) / 2.0, 0, 1) * 255
# Keep dark text black, make background pure clean white
clean_logo_arr = np.zeros((2000, 2000, 4), dtype=np.uint8)
# White disk
clean_logo_arr[:, :, 0] = 255
clean_logo_arr[:, :, 1] = 255
clean_logo_arr[:, :, 2] = 255
clean_logo_arr[:, :, 3] = circle_alpha.astype(np.uint8)

# Overlay black text elements (RGB < 50)
text_mask = (arr_logo[:, :, 0] < 50) & (arr_logo[:, :, 1] < 50) & (arr_logo[:, :, 2] < 50) & (dist < 920)
# Use original anti-aliased RGB for text
clean_logo_arr[text_mask, :3] = arr_logo[text_mask, :3]

# In 4K, logo center is at x=241, y=334, diameter=296
logo_target_size = 296
logo_cleaned = Image.fromarray(clean_logo_arr)
logo_resized = logo_cleaned.resize((logo_target_size, logo_target_size), Image.Resampling.LANCZOS)

logo_pos_x = 241 - logo_target_size // 2
logo_pos_y = 334 - logo_target_size // 2
final_img.paste(logo_resized, (logo_pos_x, logo_pos_y), logo_resized)
print(f"Pasted logo at ({logo_pos_x}, {logo_pos_y}) with size {logo_target_size}x{logo_target_size}")

print("--- Step 4: Saving intermediate base for HTML Playwright 4K text rendering ---")
final_img.save('/tmp/master_4k_base.png')
print("Base saved successfully")

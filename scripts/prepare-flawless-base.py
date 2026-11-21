import numpy as np
from PIL import Image
import os

source_path = '/Users/vikash/.gemini/antigravity-cli/brain/628e1d36-713b-4fac-9ebe-f44971074f4a/user-base-design.jpg'
orig = Image.open(source_path)
arr = np.array(orig).copy()

# 1. Seamlessly erase horizontal line at y=1536:1546
arr[1536:1546, 40:1560, :] = arr[1506:1516, 40:1560, :]

# 2. Seamlessly erase old top-left text block and stray dot (y=490 to 572, x=40 to 450)
# Shift by exactly 118px (4 grid units vertically: 30 + 29 + 30 + 29 = 118)
shift = 118
arr[490:572, 40:450, :] = arr[490-shift:572-shift, 40:450, :]

# 3. Seamlessly erase bottom paragraph text (y=1640 to 1915, x=140 to 1460)
for y in range(1640, 1915):
    margin_val = arr[y, 50:70, :].mean(axis=(0,1))
    ref_row = arr[1935, :, :].astype(float)
    ref_base = ref_row[50:70, :].mean(axis=(0,1))
    reconstructed = np.clip(margin_val + (ref_row - ref_base), 0, 255).astype(np.uint8)
    arr[y, 140:1460, :] = reconstructed[140:1460, :]

out_path = '/private/tmp/clean_base_flawless.png'
clean_base = Image.fromarray(arr)
clean_base.save(out_path)
print(f'Successfully generated flawless clean base: {out_path}')

# Verification
dark_tl = (arr[330:575, :480, 0] < 150).sum()
dark_bot = (arr[1640:1915, 140:1460, 0] < 150).sum()
print(f'Verification: dark pixels in top-left={dark_tl}, bottom={dark_bot}')
assert dark_tl == 0, 'Found leftover dark pixels in top-left region!'
assert dark_bot == 0, 'Found leftover dark pixels in bottom paragraph region!'
print('Verification passed with 0 dark pixels!')

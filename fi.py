import cv2
import matplotlib.pyplot as plt

def histogram_equalization(image_path):
    # Đọc ảnh từ đường dẫn
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    # Thực hiện cân bằng histogram
    equalized_img = cv2.equalizeHist(gray)

    # Hiển thị ảnh gốc và ảnh sau khi cân bằng histogram
    plt.figure(figsize=(8, 4))
    plt.subplot(1, 2, 1)
    # plt.imshow(img, cmap='gray')
    plt.imshow(img)
    plt.title('Original Image')

    plt.subplot(1, 2, 2)
    # plt.imshow(equalized_img)
    plt.imshow(equalized_img )
    plt.title('Equalized Image')

    plt.show()

    return equalized_img

# Thực hiện cân bằng histogram cho ảnh khuôn mặt
equalized_face = histogram_equalization('A1ZPvWaWFoBOa0sK4MbL_image12.jpg')

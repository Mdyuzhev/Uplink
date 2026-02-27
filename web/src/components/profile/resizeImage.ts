const MAX_AVATAR_SIZE = 512;
const MAX_AVATAR_BYTES = 1 * 1024 * 1024; // 1 МБ

/** Уменьшить изображение до maxSize px и maxBytes байт */
export function resizeImage(file: File, maxSize = MAX_AVATAR_SIZE, maxBytes = MAX_AVATAR_BYTES): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (img.width <= maxSize && img.height <= maxSize && file.size <= maxBytes) {
                resolve(file);
                return;
            }

            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob(
                blob => {
                    if (!blob) return reject(new Error('Canvas toBlob failed'));
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                },
                'image/jpeg',
                0.85
            );
        };
        img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
        img.src = URL.createObjectURL(file);
    });
}

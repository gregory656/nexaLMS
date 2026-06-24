// Cloudinary configuration
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const cloudinaryConfig = {
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
};

export async function uploadToCloudinary(file: File, folder: string = 'nexalms'): Promise<{ url: string; publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        throw new Error('Failed to upload image to Cloudinary');
    }

    const data = await response.json();
    return {
        url: data.secure_url,
        publicId: data.public_id,
    };
}

export function getCloudinaryUrl(publicId: string, transforms: string = ''): string {
    if (!publicId) return '';
    const base = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
    return transforms ? `${base}/${transforms}/${publicId}` : `${base}/${publicId}`;
}

export function getWatermarkUrl(publicId: string): string {
    return getCloudinaryUrl(publicId, 'w_150,o_30');
}

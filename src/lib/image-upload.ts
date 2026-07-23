const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const avatarImageLimit = 5 * 1024 * 1024;
export const complexImageLimit = 10 * 1024 * 1024;

export function assertImageUpload(file: File, maxBytes: number) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Usá una imagen JPG, PNG, WebP o AVIF.");
  }
  if (file.size === 0 || file.size > maxBytes) {
    throw new Error(`La imagen debe pesar menos de ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
  }
}

export function imageExtension(file: File) {
  return ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  } as Record<string, string>)[file.type];
}

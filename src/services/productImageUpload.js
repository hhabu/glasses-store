function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadProductImage(file) {
  if (!(file instanceof File)) {
    throw new Error("uploadProductImage requires a File object.");
  }

  // This project does not include Firebase config yet, so the editor stores
  // an encoded image for now. Replace this adapter with Firebase Storage later.
  return readFileAsDataUrl(file);
}

export function getProductImageUploadMode() {
  return "local-file-preview";
}

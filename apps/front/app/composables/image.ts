import type { Image, ImageUploadUrlResponse } from "~/types/image";

export function useImageUpload() {
  const config = useRuntimeConfig();
  const progress = ref<number>(0);
  const isUploading = ref<boolean>(false);
  const error = ref<string | null>(null);

  async function uploadToCloudflare(uploadURL: string, file: File): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          progress.value = Math.round((event.loaded / event.total) * 100);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Cloudflare upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Cloudflare upload failed due to a network error"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Cloudflare upload was aborted"));
      });

      xhr.open("POST", uploadURL);
      xhr.send(formData);
    });
  }

  async function uploadImage(file: File): Promise<string> {
    isUploading.value = true;
    progress.value = 0;
    error.value = null;

    try {
      const { uploadURL, imageId } = await $fetch<ImageUploadUrlResponse>(
        `${config.public.apiBase}/images/upload-url`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      await uploadToCloudflare(uploadURL, file);
      progress.value = 90;

      let image: Image;
      try {
        image = await $fetch<Image>(`${config.public.apiBase}/images`, {
          method: "POST",
          credentials: "include",
          body: { imageId },
        });
      } catch (saveErr) {
        const message = saveErr instanceof Error ? saveErr.message : "Failed to save image record";
        throw new Error(
          `Image was uploaded to Cloudflare but saving the record failed: ${message}`,
        );
      }

      progress.value = 100;
      return image.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      error.value = message;
      console.error("Error uploading image:", err);
      throw new Error(message);
    } finally {
      isUploading.value = false;
    }
  }

  return {
    uploadImage,
    progress,
    isUploading,
    error,
  };
}

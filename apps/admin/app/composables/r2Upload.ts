export type R2UploadResponse = {
  publicUrl: string;
  key: string;
};

export function useR2Upload() {
  const config = useRuntimeConfig();
  const progress = ref(0);
  const isUploading = ref(false);
  const error = ref<string | null>(null);

  async function uploadFile(file: File): Promise<string> {
    isUploading.value = true;
    progress.value = 0;
    error.value = null;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            progress.value = Math.round((event.loaded / event.total) * 100);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText) as R2UploadResponse;
              resolve(parsed.publicUrl);
            } catch {
              reject(new Error("Upload succeeded but the server response was invalid."));
            }
            return;
          }

          reject(new Error(`Upload failed with status ${xhr.status}`));
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed due to a network error"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was aborted"));
        });

        xhr.open("POST", `${config.public.apiBase}/storage/r2/upload`);
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      progress.value = 100;
      return publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      error.value = message;
      console.error("Error uploading to R2:", err);
      throw new Error(message);
    } finally {
      isUploading.value = false;
    }
  }

  return {
    uploadFile,
    progress,
    isUploading,
    error,
  };
}

export async function uploadFile(file: File): Promise<string> {
  try {
    const urlRes = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });

    if (urlRes.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }

    if (urlRes.ok) {
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "x-ms-blob-type": "BlockBlob",
        },
      });

      if (uploadRes.ok) {
        return objectPath;
      }
      console.warn("Presigned URL upload failed, falling back to direct upload");
    } else {
      console.warn("Failed to get presigned URL, falling back to direct upload");
    }
  } catch (err: any) {
    if (err.message === "Session expired. Please log in again.") {
      throw err;
    }
    console.warn("Presigned URL flow failed, falling back to direct upload:", err.message);
  }

  const directRes = await fetch("/api/uploads/direct", {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    credentials: "include",
  });

  if (!directRes.ok) {
    if (directRes.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    const errData = await directRes.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to upload file");
  }

  const { objectPath } = await directRes.json();
  return objectPath;
}

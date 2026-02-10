import type { Express } from "express";
import { ObjectNotFoundError } from "./objectStorage";
import { fileStorageService } from "../../fileStorage";

export function registerObjectStorageRoutes(app: Express): void {
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      let result: { uploadURL: string; objectPath: string } | null = null;
      let lastError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          result = await fileStorageService.getUploadURL(contentType);
          break;
        } catch (err) {
          lastError = err;
          console.error(`Upload URL attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
          if (attempt < 2) await new Promise(r => setTimeout(r, 500));
        }
      }
      if (!result) {
        console.error("All upload URL attempts failed:", lastError);
        return res.status(500).json({ error: "Storage service temporarily unavailable. Please try again." });
      }

      res.json({
        uploadURL: result.uploadURL,
        objectPath: result.objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.get(/^\/objects\/(.+)$/, async (req, res) => {
    try {
      await fileStorageService.getFileStream(req.path, res);
    } catch (error: any) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError || error?.statusCode === 404) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

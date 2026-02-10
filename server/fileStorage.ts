import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";
import { randomUUID } from "crypto";
import { Response } from "express";

let ReplitObjectStorageService: any = null;
let ReplitObjectNotFoundError: any = null;

try {
  const replitStorage = require("./replit_integrations/object_storage/objectStorage");
  ReplitObjectStorageService = replitStorage.ObjectStorageService;
  ReplitObjectNotFoundError = replitStorage.ObjectNotFoundError;
} catch {}

export function isAzureStorage(): boolean {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}

export function isReplitStorage(): boolean {
  return !!process.env.PRIVATE_OBJECT_DIR && !isAzureStorage();
}

export class FileStorageService {
  private azureContainerClient: ContainerClient | null = null;
  private azureBlobServiceClient: BlobServiceClient | null = null;
  private replitService: any = null;
  private containerName: string;

  constructor() {
    this.containerName = process.env.AZURE_STORAGE_CONTAINER || "uploads";

    if (isAzureStorage()) {
      const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING!;
      this.azureBlobServiceClient = BlobServiceClient.fromConnectionString(connStr);
      this.azureContainerClient = this.azureBlobServiceClient.getContainerClient(this.containerName);
      this.initAzureContainer();
    } else if (isReplitStorage() && ReplitObjectStorageService) {
      this.replitService = new ReplitObjectStorageService();
    }
  }

  private async initAzureContainer(): Promise<void> {
    try {
      if (this.azureContainerClient) {
        await this.azureContainerClient.createIfNotExists();
        console.log(`[FileStorage] Azure container '${this.containerName}' ready`);
      }
    } catch (err) {
      console.error("[FileStorage] Failed to init Azure container:", err);
    }
  }

  async getUploadURL(contentType?: string): Promise<{ uploadURL: string; objectPath: string }> {
    if (isAzureStorage()) {
      return this.getAzureUploadURL(contentType);
    }
    return this.getReplitUploadURL();
  }

  private async getAzureUploadURL(contentType?: string): Promise<{ uploadURL: string; objectPath: string }> {
    if (!this.azureContainerClient || !this.azureBlobServiceClient) {
      throw new Error("Azure storage not configured");
    }

    const blobId = randomUUID();
    const blobName = `uploads/${blobId}`;
    const blockBlobClient = this.azureContainerClient.getBlockBlobClient(blobName);

    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING!;
    const accountName = this.extractAccountName(connStr);
    const accountKey = this.extractAccountKey(connStr);

    if (!accountName || !accountKey) {
      throw new Error("Could not parse Azure storage credentials from connection string");
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const startsOn = new Date();
    startsOn.setMinutes(startsOn.getMinutes() - 5);
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 15);

    const permissions = new BlobSASPermissions();
    permissions.write = true;
    permissions.create = true;

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions,
        startsOn,
        expiresOn,
        contentType: contentType || undefined,
      },
      sharedKeyCredential
    );

    const uploadURL = `${blockBlobClient.url}?${sasParams.toString()}`;
    const objectPath = `/objects/uploads/${blobId}`;

    return { uploadURL, objectPath };
  }

  private async getReplitUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    if (!this.replitService) {
      throw new Error("Replit storage not available");
    }

    const uploadURL = await this.replitService.getObjectEntityUploadURL();
    const objectPath = this.replitService.normalizeObjectEntityPath(uploadURL);

    return { uploadURL, objectPath };
  }

  async getFileStream(objectPath: string, res: Response): Promise<void> {
    if (isAzureStorage()) {
      return this.streamFromAzure(objectPath, res);
    }
    return this.streamFromReplit(objectPath, res);
  }

  private async streamFromAzure(objectPath: string, res: Response): Promise<void> {
    if (!this.azureContainerClient) {
      throw new Error("Azure storage not configured");
    }

    const blobName = this.objectPathToBlobName(objectPath);
    const blockBlobClient = this.azureContainerClient.getBlockBlobClient(blobName);

    try {
      const properties = await blockBlobClient.getProperties();
      const downloadResponse = await blockBlobClient.download(0);

      if (!downloadResponse.readableStreamBody) {
        throw new Error("No stream body available");
      }

      res.set({
        "Content-Type": properties.contentType || "application/octet-stream",
        "Content-Length": String(properties.contentLength || 0),
        "Cache-Control": "public, max-age=3600",
      });

      downloadResponse.readableStreamBody.pipe(res);
    } catch (err: any) {
      if (err.statusCode === 404) {
        const notFoundErr = new Error("Object not found");
        (notFoundErr as any).statusCode = 404;
        throw notFoundErr;
      }
      throw err;
    }
  }

  private async streamFromReplit(objectPath: string, res: Response): Promise<void> {
    if (!this.replitService) {
      throw new Error("Replit storage not available");
    }

    const objectFile = await this.replitService.getObjectEntityFile(objectPath);
    await this.replitService.downloadObject(objectFile, res);
  }

  async fileExists(objectPath: string): Promise<boolean> {
    if (isAzureStorage()) {
      return this.azureFileExists(objectPath);
    }
    return this.replitFileExists(objectPath);
  }

  private async azureFileExists(objectPath: string): Promise<boolean> {
    if (!this.azureContainerClient) return false;

    const blobName = this.objectPathToBlobName(objectPath);
    const blockBlobClient = this.azureContainerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.getProperties();
      return true;
    } catch {
      return false;
    }
  }

  private async replitFileExists(objectPath: string): Promise<boolean> {
    if (!this.replitService) return false;

    try {
      await this.replitService.getObjectEntityFile(objectPath);
      return true;
    } catch {
      return false;
    }
  }

  normalizeObjectPath(rawPath: string): string {
    if (isAzureStorage()) {
      return rawPath;
    }
    if (this.replitService) {
      return this.replitService.normalizeObjectEntityPath(rawPath);
    }
    return rawPath;
  }

  private objectPathToBlobName(objectPath: string): string {
    if (objectPath.startsWith("/objects/")) {
      return objectPath.slice("/objects/".length);
    }
    return objectPath;
  }

  private extractAccountName(connStr: string): string | null {
    const match = connStr.match(/AccountName=([^;]+)/i);
    return match ? match[1] : null;
  }

  private extractAccountKey(connStr: string): string | null {
    const match = connStr.match(/AccountKey=([^;]+)/i);
    return match ? match[1] : null;
  }

  getReplitService(): any {
    return this.replitService;
  }
}

export const fileStorageService = new FileStorageService();

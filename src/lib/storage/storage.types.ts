// The Strategy pattern contract: services only talk to this shape, never to a vendor SDK
export type UploadFileInputType = {
  key: string;
  body: Buffer;
  contentType: string;
};

export type FileStorageType = {
  upload(input: UploadFileInputType): Promise<void>;
  delete(key: string): Promise<void>;
  // A URL the browser can load the file from (public/CDN URL or a short-lived signed URL)
  getUrl(key: string): Promise<string>;
  // Throws if the bucket is unreachable or the credentials are wrong
  checkConnection(): Promise<void>;
};

declare module 'multer' {
  import { RequestHandler } from 'express';

  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
  }

  interface Options {
    storage?: unknown;
    limits?: { fileSize?: number; files?: number };
    fileFilter?: (
      req: Express.Request,
      file: File,
      cb: (error: Error | null, acceptFile?: boolean) => void,
    ) => void;
  }

  interface Multer {
    single(fieldName: string): RequestHandler;
  }

  interface MulterStatic {
    (options?: Options): Multer;
    diskStorage(options: {
      destination?:
        | string
        | ((
            req: Express.Request,
            file: File,
            cb: (error: Error | null, destination: string) => void,
          ) => void);
      filename?: (
        req: Express.Request,
        file: File,
        cb: (error: Error | null, filename: string) => void,
      ) => void;
    }): unknown;
    MulterError: new (code: string, field?: string) => Error & { code: string };
  }

  const multer: MulterStatic;
  export = multer;
}

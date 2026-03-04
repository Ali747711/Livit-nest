import { v2 as cloudinary } from 'cloudinary';

// Config is called lazily inside the function to ensure process.env is
// populated by ConfigModule.forRoot() before Cloudinary reads the values.

const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

export const uploadToCloudinary = async (stream: NodeJS.ReadableStream, folder: string): Promise<string> => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const buffer = await streamToBuffer(stream);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error || !result) {
          console.error('Cloudinary upload error:', error);
          return reject(error ?? new Error('Cloudinary upload failed'));
        }
        resolve(result.secure_url);
      })
      .end(buffer);
  });
};

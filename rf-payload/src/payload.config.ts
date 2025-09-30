// storage-adapter-import-placeholder
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Events } from './collections/Events'
import { Attendance } from './collections/Attendance'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Events, Attendance],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  /**
   * CORS / CSRF - Allow frontend access
   */
  cors: [
    ...(isDevelopment ? ["*"] : []),
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ],
  csrf: [
    ...(isDevelopment ? ["*"] : []),
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  upload: {
    limits: {
      fileSize: 50000000, // 50MB
    },
  },
  plugins: [

    ...(isProduction ? [payloadCloudPlugin()] : []),
    ...(isProduction && process.env.BLOB_READ_WRITE_TOKEN ? [
      vercelBlobStorage({
        collections: {
          media: true,
        },
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
    ] : []),
  ],
})
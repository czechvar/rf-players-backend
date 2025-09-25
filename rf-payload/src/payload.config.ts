// storage-adapter-import-placeholder
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
    "http://localhost:3000", 
    "http://localhost:4000", 
    "http://127.0.0.1:3000", 
    "http://127.0.0.1:4000",
    "http://0.0.0.0:4000",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ],
  csrf: [
    "http://localhost:3000", 
    "http://localhost:4000", 
    "http://127.0.0.1:3000", 
    "http://127.0.0.1:4000",
    "http://0.0.0.0:4000",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})

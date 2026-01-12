// @ts-ignore
import extractChunks from 'png-chunks-extract'
// @ts-ignore
import encodeChunks from 'png-chunks-encode'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
// png-chunk-text has no types; import via require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const textChunk = require('png-chunk-text')

// Unified storage interface for images
// Provider: 'local' (default) or 's3'

function getProvider(): 'local' | 's3' {
  const p = process.env.STORAGE_PROVIDER?.toLowerCase()
  return p === 's3' ? 's3' : 'local'
}

function getPublicBase(): string | undefined {
  return process.env.AWS_S3_PUBLIC_BASE_URL
}

export async function saveImage(
  imageData: string,
  filename: string,
  watermark?: {
    visibleText?: string;
    hiddenText?: string;
    hiddenKey?: string;
    visibleOptions?: {
      position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      opacity?: number;
      bar?: boolean;
      fontScale?: number;
      fontFamily?: string;
      fontDataUrl?: string;
    };
  }
): Promise<string> {
  const provider = getProvider()
  if (provider === 's3') {
    return await saveToS3(imageData, filename)
  }
  return await saveToLocal(imageData, filename, watermark)
}

async function saveToLocal(
  imageData: string,
  filename: string,
  watermark?: {
    visibleText?: string;
    hiddenText?: string;
    hiddenKey?: string;
    visibleOptions?: {
      position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      opacity?: number;
      bar?: boolean;
      fontScale?: number;
      fontFamily?: string;
      fontDataUrl?: string;
    };
  }
): Promise<string> {
  const storagePath = process.env.LOCAL_STORAGE_PATH || 'public/images'
  const fullDirPath = path.join(process.cwd(), storagePath)
  await mkdir(fullDirPath, { recursive: true })

  const base64Data = imageData.startsWith('data:image/png;base64,')
    ? imageData.split(',')[1]
    : imageData

  let buffer = Buffer.from(base64Data, 'base64')

  // Apply visible watermark if provided
  if (watermark?.visibleText) {
    try {
      const meta = await sharp(buffer).metadata()
      const w = meta.width || 1024
      const h = meta.height || 1024
      const pos = watermark.visibleOptions?.position || 'bottom-right'
      const opacity = watermark.visibleOptions?.opacity ?? 0.15
      const showBar = watermark.visibleOptions?.bar ?? true
      const fontScale = watermark.visibleOptions?.fontScale ?? 0.03
      const fontFamily = watermark.visibleOptions?.fontFamily || 'Arial, Helvetica, sans-serif'
      const fontDataUrl = watermark.visibleOptions?.fontDataUrl
      const fontSize = Math.max(16, Math.round(w * fontScale))
      const padding = Math.max(10, Math.round(w * 0.02))

      const xEnd = w - padding
      const xStart = padding
      const yBottom = h - padding
      const yTop = padding + fontSize
      const anchor = (pos.endsWith('right') ? 'end' : 'start')
      const x = pos.endsWith('right') ? xEnd : xStart
      const y = pos.startsWith('top') ? yTop : yBottom

      const barY = pos.startsWith('top') ? 0 : h - (fontSize + padding * 2)
      const fontFace = fontDataUrl ? `@font-face { font-family: 'WMOverlayFont'; src: url(${fontDataUrl}); font-weight: normal; font-style: normal; }` : ''
      const appliedFamily = fontDataUrl ? 'WMOverlayFont' : fontFamily
      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">\n  <style>${fontFace}</style>\n  ${showBar ? `<rect x=\"0\" y=\"${barY}\" width=\"${w}\" height=\"${fontSize + padding * 2}\" fill=\"black\" fill-opacity=\"${opacity}\"/>` : ''}\n  <text x=\"${x}\" y=\"${y}\" text-anchor=\"${anchor}\" fill=\"white\" fill-opacity=\"${Math.min(1, opacity + 0.55)}\" font-family=\"${appliedFamily}\" font-size=\"${fontSize}\">${watermark.visibleText}</text>\n</svg>`
      // @ts-ignore
      buffer = await sharp(buffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png()
        .toBuffer()
    } catch (e) {
      // Ignore watermark failure and proceed
    }
  }

  // Apply hidden watermark via PNG tEXt chunk if provided
  if (watermark?.hiddenText) {
    try {
      const chunks = extractChunks(buffer)
      // Insert text chunk before IEND
      const wmChunk = textChunk.encode(watermark.hiddenKey || 'watermark', watermark.hiddenText)
      chunks.splice(chunks.length - 1, 0, wmChunk)
      const encoded = encodeChunks(chunks)
      buffer = Buffer.from(encoded)
    } catch (e) {
      // Ignore hidden watermark failure and proceed
    }
  }
  const filePath = path.join(fullDirPath, filename)
  await writeFile(filePath, buffer)

  const publicPath = storagePath.startsWith('public/') ? storagePath.substring(7) : storagePath
  return `/${publicPath}/${filename}`
}

async function saveToS3(imageData: string, filename: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET
  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const baseUrl = getPublicBase()

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    // Fallback to local if S3 not fully configured
    return await saveToLocal(imageData, filename)
  }

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })

  const base64Data = imageData.startsWith('data:image/png;base64,')
    ? imageData.split(',')[1]
    : imageData

  const buffer = Buffer.from(base64Data, 'base64')
  const key = `images/${filename}`

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
    ACL: 'public-read',
  }))

  if (baseUrl) {
    return `${baseUrl}/${key}`
  }
  // Default AWS S3 public URL format
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}
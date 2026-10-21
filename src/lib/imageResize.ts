/**
 * إعدادات تحويل وتصغير الصور إلى صيغة WebP الحديثة:
 * - النسخة الكاملة (Full): حتى 1400px وجودة 85% لحفظ تفاصيل الخشب والحفر ودرجات الألوان.
 * - النسخة المصغّرة (Thumbnail): حتى 480px وجودة 80% لبطاقات العرض والمعارض لتوفير الباندويث والسرعة.
 */
export const IMAGE_CONFIG = {
  full: {
    maxDim: 1400,
    quality: 0.85,
  },
  thumb: {
    maxDim: 480,
    quality: 0.80,
  },
} as const;

export interface OptimizedImageVersion {
  blob: Blob;
  contentType: "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
}

export interface OptimizedImagePair {
  full: OptimizedImageVersion;
  thumb: OptimizedImageVersion;
}

/**
 * يقرأ ملف أو Blob صورة ويجهزه في HTMLImageElement بسرعة ودون استهلاك ذاكرة base64 زائدة.
 */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("تعذّرت قراءة ملف الصورة."));
    };
    img.src = objectUrl;
  });
}

/**
 * يرسم الصورة على canvas بأبعاد محسوبة دون تكبير الصور الأصغر،
 * مع تفعيل أعلى درجات التنعيم للحفاظ على أدق تفاصيل الحفر والخشب وخطوط النقوش.
 * الشفافية (Alpha channel) تبقى محفوظة بالكامل لأن الـ canvas لا يُملأ بأي خلفية معتمة.
 */
function renderToCanvas(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) {
    throw new Error("تعذّر إنشاء سياق canvas.");
  }

  // تفعيل التنعيم عالي الجودة للحفاظ على تفاصيل الخشب والحفر الدقيقة
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // رسم الصورة كما هي للحفاظ التام على ألوانها وشفافيتها الأصلية
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
}

/**
 * يحوّل الـ canvas إلى Blob بصيغة WebP وبجودة محددة.
 */
function canvasToWebPBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("تعذّر تحويل الصورة إلى WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

/**
 * يولّد نسختين WebP محسّنتين من ملف الصورة دفعة واحدة (عرض كامل + مصغّرة للبطاقات).
 * يقرأ الصورة الأصلية مرة واحدة فقط في الذاكرة لتوفير الأداء والسرعة.
 */
export async function createOptimizedWebPPair(
  file: File,
  fullConfig: { maxDim: number; quality: number } = IMAGE_CONFIG.full,
  thumbConfig: { maxDim: number; quality: number } = IMAGE_CONFIG.thumb
): Promise<OptimizedImagePair> {
  const img = await loadImage(file);

  const fullCanvas = renderToCanvas(img, fullConfig.maxDim);
  const thumbCanvas = renderToCanvas(img, thumbConfig.maxDim);

  const [fullBlob, thumbBlob] = await Promise.all([
    canvasToWebPBlob(fullCanvas, fullConfig.quality),
    canvasToWebPBlob(thumbCanvas, thumbConfig.quality),
  ]);

  return {
    full: {
      blob: fullBlob,
      contentType: "image/webp",
      width: fullCanvas.width,
      height: fullCanvas.height,
      sizeBytes: fullBlob.size,
    },
    thumb: {
      blob: thumbBlob,
      contentType: "image/webp",
      width: thumbCanvas.width,
      height: thumbCanvas.height,
      sizeBytes: thumbBlob.size,
    },
  };
}

/**
 * يحوّل الصورة إلى WebP مفرد بالحجم والجودة المحددة (يُستخدم لصورة الهيرو أو التصاميم المخصصة).
 */
export async function fileToWebPBlob(
  file: File,
  maxDim: number = IMAGE_CONFIG.full.maxDim,
  quality: number = IMAGE_CONFIG.full.quality
): Promise<{ blob: Blob; contentType: "image/webp"; width: number; height: number; sizeBytes: number }> {
  const img = await loadImage(file);
  const canvas = renderToCanvas(img, maxDim);
  const blob = await canvasToWebPBlob(canvas, quality);

  return {
    blob,
    contentType: "image/webp",
    width: canvas.width,
    height: canvas.height,
    sizeBytes: blob.size,
  };
}

/**
 * تابع للتوافق مع أي استدعاءات قديمة تعتمد على الاسم السابق.
 */
export async function fileToResizedBlob(
  file: File,
  maxDim: number = IMAGE_CONFIG.full.maxDim,
  quality: number = IMAGE_CONFIG.full.quality
): Promise<{ blob: Blob; contentType: string }> {
  const res = await fileToWebPBlob(file, maxDim, quality);
  return { blob: res.blob, contentType: res.contentType };
}

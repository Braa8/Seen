import Image from 'next/image';
import { useState, useRef, ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';

interface ImageUploaderProps {
  onImageUpload: (base64Image: string) => Promise<string>;
  previewClassName?: string;
  initialImage?: string;
  maxSizeMB?: number;
  label?: string;
}

export default function ImageUploader({ 
  onImageUpload, 
  previewClassName = '',
  initialImage = '',
  maxSizeMB = 5,
  label = 'اختر صورة'
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(initialImage || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
      toast.error('الرجاء اختيار ملف صورة صالح (JPG, PNG, WebP, GIF)');
      return;
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`حجم الصورة كبير جداً (الحد الأقصى ${maxSizeMB} ميجابايت)`);
      return;
    }

    try {
      setIsUploading(true);
      
      // Convert to base64 and set preview
      const base64Image = await fileToBase64(file);
      setPreviewUrl(base64Image);
      
      // Upload the base64 image
      const imageUrl = await onImageUpload(base64Image);
      setPreviewUrl(imageUrl);
      
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل معالجة الصورة';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base">
          {isUploading ? 'جاري الرفع...' : label}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={isUploading}
          />
        </label>
        
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
            disabled={isUploading}
          >
            إزالة الصورة
          </button>
        )}
        
        {isUploading && (
          <div className="text-gray-500 text-sm sm:text-base">
            جاري معالجة الصورة...
          </div>
        )}
      </div>

      {(previewUrl || initialImage) && (
        <div className={`mt-4 ${previewClassName}`}>
          <h3 className="text-sm font-medium text-gray-700 mb-2">معاينة الصورة:</h3>
          <div className="border rounded-lg overflow-hidden max-w-2xl">
            <div className="relative w-full h-64 bg-gray-100">
              <Image
                src={previewUrl || initialImage}
                alt="معاينة الصورة"
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={!!previewUrl}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Image from 'next/image';
import { useState, useRef, ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';

interface ImageUploaderProps {
  onImageUpload: (file: File) => Promise<string>;
  previewClassName?: string;
  initialImage?: string;
}

export default function ImageUploader({ 
  onImageUpload, 
  previewClassName = '',
  initialImage = ''
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(initialImage || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload image
      const imageUrl = await onImageUpload(file);
      setPreviewUrl(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('فشل رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          {isUploading ? 'جاري الرفع...' : 'اختر صورة'}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={isUploading}
          />
        </label>
        {isUploading && (
          <div className="text-gray-500">جاري رفع الصورة...</div>
        )}
      </div>

      {(previewUrl || initialImage) && (
        <div className={`mt-4 ${previewClassName}`}>
          <h3 className="text-sm font-medium text-gray-700 mb-2">معاينة الصورة:</h3>
          <div className="border rounded-lg overflow-hidden">
            <Image
              src={previewUrl || initialImage}
              alt="معاينة الصورة"
              className="w-full h-auto max-h-64 object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

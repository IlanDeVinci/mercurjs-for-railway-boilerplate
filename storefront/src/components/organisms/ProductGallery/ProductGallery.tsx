import { GalleryCarousel } from '@/components/organisms';
import { HttpTypes } from '@medusajs/types';

export default {}
export const ProductGallery = ({
  images,
}: {
  images: HttpTypes.StoreProduct['images'];
}) => {
  return (
    <div>
      <GalleryCarousel images={images} />
    </div>
  );
};

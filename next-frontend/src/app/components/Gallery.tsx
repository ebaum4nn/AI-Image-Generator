'use client';

import React, { useEffect, useState } from 'react';

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: Date;
}

interface GalleryProps {
  images: GeneratedImage[];
  isDebugMode?: boolean;
  onRemoveImage?: (imageId: string) => void;
}

export default function Gallery({
  images,
  isDebugMode = false,
  onRemoveImage,
}: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 9; // 3x3 grid by default
  const totalPages = Math.ceil(images.length / imagesPerPage) || 1;
  const pageImages = images.slice(
    (currentPage - 1) * imagesPerPage,
    currentPage * imagesPerPage
  );

  const closeLightbox = () => setSelectedImage(null);

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImage || !images.length) return;
    const idx = images.findIndex((img) => img.id === selectedImage.id);
    if (idx === -1) return;
    let newIndex = idx;
    const step = direction === 'prev' ? -1 : 1;
    do {
      newIndex = (newIndex + step + images.length) % images.length;
      if (images[newIndex]?.imageUrl) break;
    } while (newIndex !== idx);
    if (images[newIndex]?.imageUrl) setSelectedImage(images[newIndex]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateImage('next');
      }
    };
    if (selectedImage) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [selectedImage, images]);

  // When a new processing placeholder gets added to the top, reset to page 1
  useEffect(() => {
    if (images?.[0]?.id?.startsWith?.('processing-')) {
      setCurrentPage(1);
    }
  }, [images]);

  // Adjust current page if images shrink and current page overflows
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleTrash = async (imageId: string) => {
    if (!confirm('Are you sure you want to trash this image?')) return;
    try {
      const response = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: parseInt(imageId) }),
      });

      if (response.ok) {
        onRemoveImage?.(imageId);
      } else {
        alert('Failed to trash image. Please try again.');
      }
    } catch (err) {
      console.error('Error trashing image:', err);
      alert('Failed to trash image. Please try again.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Generated Images</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 text-right">
          Showing {Math.min((currentPage - 1) * imagesPerPage + 1, images.length)} to {Math.min(currentPage * imagesPerPage, images.length)} of {images.length} images
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pageImages.map((image) => (
          <div key={image.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {image.imageUrl ? (
              <>
                <img
                  src={image.imageUrl}
                  alt={image.prompt}
                  className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(image)}
                />
                <div className="p-4">
                  <p className="text-xs text-gray-400 dark:text-gray-400 mb-2 text-right">
                    {(() => {
                      const date = new Date(image.timestamp);
                      const day = date.getDate().toString().padStart(2, '0');
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const year = date.getFullYear().toString().slice(-2);
                      const hours24 = date.getHours();
                      const hours12 = hours24 % 12 || 12;
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      const ampm = hours24 >= 12 ? 'PM' : 'AM';
                      return `${day}.${month}.${year} ${hours12}:${minutes} ${ampm}`;
                    })()}
                  </p>
                  {isDebugMode && (
                    <p className="text-sm text-gray-900 dark:text-white mb-2">{image.prompt}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <a
                      href={image.imageUrl}
                      download={`image_${image.id}.png`}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                      aria-label="Download"
                      title="Download"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4 text-gray-700 dark:text-gray-300"
                        aria-hidden="true"
                      >
                        <path d="M12 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L11 14.586V4a1 1 0 011-1z" />
                        <path d="M5 19a1 1 0 011-1h12a1 1 0 110 2H6a1 1 0 01-1-1z" />
                      </svg>
                    </a>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedImage(image)}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                        aria-label="Enlarge"
                        title="Enlarge"
                      >
                        ⛶
                      </button>
                      <button
                        onClick={() => handleTrash(image.id)}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 dark:text-red-300 dark:bg-red-900 dark:hover:bg-red-800"
                        title="Trash image"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto mb-2"></div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Processing...</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {images.length > imagesPerPage && (
        <div className="flex justify-center items-center space-x-4 mt-8">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Previous
          </button>

          <div className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-4xl max-h-full flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage('prev');
              }}
              className="absolute left-4 text-white bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all z-10"
            >
              ‹
            </button>

            <div className="relative">
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.prompt}
                className="max-w-full max-h-[80vh] object-contain"
              />
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all"
              >
                ✕
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage('next');
              }}
              className="absolute right-4 text-white bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all z-10"
            >
              ›
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4">
            {isDebugMode && (
              <h3 className="text-lg font-semibold mb-2">{selectedImage.prompt}</h3>
            )}
            <p className="text-xs text-gray-300 mb-2 text-right">
              Generated on {(() => {
                const date = new Date(selectedImage.timestamp);
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const hours24 = date.getHours();
                const hours12 = hours24 % 12 || 12;
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const year = date.getFullYear().toString().slice(-2);
                const ampm = hours24 >= 12 ? 'PM' : 'AM';
                return `${day}.${month}.${year} ${hours12}:${minutes} ${ampm}`;
              })()}
            </p>
            <div className="flex space-x-3">
              <a
                href={selectedImage.imageUrl}
                download={`image_${selectedImage.id}.png`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 bg-opacity-50 rounded-md hover:bg-opacity-75 transition-all"
                aria-label="Download"
                title="Download"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 text-gray-300"
                  aria-hidden="true"
                >
                  <path d="M12 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L11 14.586V4a1 1 0 011-1z" />
                  <path d="M5 19a1 1 0 011-1h12a1 1 0 110 2H6a1 1 0 01-1-1z" />
                </svg>
              </a>
              <button
                onClick={() => {
                  handleTrash(selectedImage.id);
                  closeLightbox();
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-400 bg-red-900 bg-opacity-50 rounded-md hover:bg-opacity-75 transition-all"
              >
                🗑️ Trash Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

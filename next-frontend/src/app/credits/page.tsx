'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: Date;
}

interface PaymentMethodSummary {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50,
    price: 4.99,
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 150,
    price: 12.99,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 500,
    price: 34.99,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    credits: 2000,
    price: 99.99,
  },
];

// CreditsPageWrapper Component
function CreditsPageWrapper() {
  return <CreditsPageContent />;
}

// Main CreditsPage Component
function CreditsPageContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [currentCredits, setCurrentCredits] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummary[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 10; // Show more images per page on credits page

  // Check authentication
  useEffect(() => {
    if (!session && status !== 'loading') {
      // User not authenticated - limited view
    } else if (session) {
      // User authenticated
    }
  }, [session, status, router])

  // Fetch current credits
  const fetchCredits = async () => {
    if (session?.user?.id) {
      try {
        const response = await fetch('/api/credits')
        const data = await response.json()
        if (data.success) {
          setCurrentCredits(data.credits)
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error)
      }
    }
  }

  // Load previously generated images
  const loadPreviousImages = async () => {
    if (!session || !session.user) return;

    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const previousImages: GeneratedImage[] = data.images.map((img: any) => ({
            id: img.id.toString(),
            prompt: img.prompt,
            imageUrl: img.imageUrl,
            timestamp: new Date(img.timestamp),
          }));

          setGeneratedImages(previousImages);
          // Reset to page 1 when loading images
          setCurrentPage(1);
        }
      }
    } catch (error) {
      console.error('Failed to load previous images:', error);
    }
  };

  // Load saved payment methods
  const loadPaymentMethods = async () => {
    if (!session?.user?.email) return;
    try {
      setPmLoading(true);
      setPmError(null);
      const res = await fetch('/api/billing/payment-methods');
      const data = await res.json();
      if (!res.ok) {
        setPmError(typeof data?.error === 'string' ? data.error : 'Failed to load payment methods');
        setPaymentMethods([]);
        setDefaultPaymentMethodId(null);
        return;
      }
      setPaymentMethods(Array.isArray(data.items) ? data.items : []);
      setDefaultPaymentMethodId(typeof data.default_payment_method_id === 'string' ? data.default_payment_method_id : null);
    } catch (e) {
      setPmError('Failed to load payment methods');
      setPaymentMethods([]);
      setDefaultPaymentMethodId(null);
    } finally {
      setPmLoading(false);
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      const res = await fetch('/api/billing/default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        alert('Failed to set default payment method');
        return;
      }
      setDefaultPaymentMethodId(paymentMethodId);
      setPaymentMethods(prev => prev.map(pm => ({ ...pm, is_default: pm.id === paymentMethodId })));
    } catch (e) {
      alert('Failed to set default payment method');
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      const res = await fetch('/api/billing/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        alert('Failed to delete payment method');
        return;
      }
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      if (defaultPaymentMethodId === paymentMethodId) {
        setDefaultPaymentMethodId(null);
      }
    } catch (e) {
      alert('Failed to delete payment method');
    }
  };

  // Fetch credits and images on mount and when session changes
  useEffect(() => {
    fetchCredits()
    loadPreviousImages()
    loadPaymentMethods()
  }, [session])


  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if debug mode is enabled
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

  const handleImageClick = (image: GeneratedImage) => {
    setSelectedImage(image);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const handleTrashImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to trash this image?')) {
      return;
    }

    try {
      const response = await fetch('/api/trash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId: parseInt(imageId) }),
      });

      if (response.ok) {
        // Remove from local state
        setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
        // Close lightbox if the trashed image was selected
        if (selectedImage?.id === imageId) {
          setSelectedImage(null);
        }
        // Refresh images from server
        loadPreviousImages();
        // Reset to first page if current page becomes empty
        setTimeout(() => {
          const remainingImages = generatedImages.filter(img => img.id !== imageId);
          const totalPages = Math.ceil(remainingImages.length / imagesPerPage);
          if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
          }
        }, 100);
      } else {
        alert('Failed to trash image. Please try again.');
      }
    } catch (error) {
      console.error('Error trashing image:', error);
      alert('Failed to trash image. Please try again.');
    }
  };

  const handlePurchase = async (packageId: string) => {
    setIsProcessing(true);
    setSelectedPackage(packageId);
    try {
      // Check billing status
      const statusRes = await fetch('/api/billing/status');
      const statusData = await statusRes.json();
      if (!statusRes.ok || !statusData.ready) {
        alert('Please add your billing information in your Profile before purchasing credits.');
        router.push('/profile');
        return;
      }

      // Attempt off-session purchase
      const purchaseRes = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const purchaseData = await purchaseRes.json();

      if (purchaseRes.ok && purchaseData.success) {
        await handlePaymentSuccess(typeof purchaseData.effectiveCredits === 'number' ? purchaseData.effectiveCredits : undefined);
        return;
      }

      if (purchaseData?.error === 'NO_BILLING') {
        alert('No billing method on file. Please add billing information in your Profile.');
        router.push('/profile');
        return;
      }

      if (purchaseData?.error === 'REQUIRES_ACTION') {
        alert('Your bank requires additional authentication. Please update billing information in your Profile.');
        router.push('/profile');
        return;
      }

      alert('Purchase failed. Please try again later.');
    } catch (err) {
      alert('Purchase failed. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (effectiveCredits?: number) => {
    // Fallback: add credits directly if webhooks aren’t configured locally
    try {
      const pkg = creditPackages.find(p => p.id === selectedPackage);
      const creditsToAdd = typeof effectiveCredits === 'number' ? effectiveCredits : (pkg?.credits ?? 0);
      if (creditsToAdd > 0 && session?.user?.id) {
        const res = await fetch('/api/credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', amount: creditsToAdd })
        });
        // Ignore errors here; webhook should handle prod
        if (!res.ok) {
          // Credits add fallback failed
        }
      }
    } catch (e) {
      // Credits add fallback error
    }

    // Refresh credits and session
    await update();
    await fetchCredits();
    alert('Payment successful! Your credits have been added.');
  };

  const handleCancelPayment = () => {
    setSelectedPackage('');
  };

  const hasCredits = session ? currentCredits > 0 : false;


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
          {!hasCredits ? (
          // No credits - show only buying screen
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Buy Credits</h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                You need credits to generate images. Choose a package below to get started.
              </p>
            </div>

            

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {creditPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 transition-all duration-200 ${
                    selectedPackage === pkg.id
                      ? 'border-blue-500 ring-2 ring-blue-400'
                      : pkg.popular
                        ? 'border-blue-500 shadow-lg scale-105'
                        : 'border-gray-200'
                  } hover:border-blue-500 hover:ring-2 hover:ring-blue-300`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {pkg.name}
                    </h3>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {pkg.credits}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">credits</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                      ${pkg.price}
                    </div>

                    <button
                      onClick={() => (session ? handlePurchase(pkg.id) : router.push('/auth/signin'))}
                      disabled={isProcessing}
                      className={`w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-500 ${
                        pkg.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-800 text-white'
                      }`}
                    >
                      {isProcessing ? 'Processing...' : (session ? 'Buy Now' : 'Sign In to Buy')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Has credits - show 2-column layout
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Credits & Billing</h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Manage your credits and purchase more when needed
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Left Column - Credit Usage & Balance */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Current Balance</h2>
                  <div className="text-center">
                    <div className="text-6xl font-bold text-blue-600 mb-2">{currentCredits}</div>
                    <div className="text-xl text-gray-700 dark:text-gray-300">credits remaining</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">How Credits Are Used</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Image Generation</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">Each image costs 1 credit</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 px-4 py-1 rounded-full">1</div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Credit Validity</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">Credits never expire</div>
                      </div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 px-4 py-1 rounded-full">∞</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Usage History</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3">Date & Time</th>
                          {isDebugMode && <th scope="col" className="px-6 py-3">Prompt</th>}
                          <th scope="col" className="px-6 py-3">Status</th>
                          <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedImages
                          .slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage)
                          .map((image) => (
                          <tr key={image.id} className="bg-white dark:bg-gray-800 border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-400 text-right">
                              {(() => {
                                const date = new Date(image.timestamp);
                                const day = date.getDate().toString().padStart(2, '0');
                                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                const year = date.getFullYear();
                                const hours24 = date.getHours();
                                const hours12 = hours24 % 12 || 12;
                                const minutes = date.getMinutes().toString().padStart(2, '0');
                                const seconds = date.getSeconds().toString().padStart(2, '0');
                                const ampm = hours24 >= 12 ? 'PM' : 'AM';
                                return `${month}/${day}/${year} ${hours12}:${minutes}:${seconds} ${ampm}`;
                              })()}
                            </td>
                            {isDebugMode && (
                              <td className="px-6 py-4 text-gray-700 dark:text-gray-200 max-w-xs truncate" title={image.prompt}>
                                {image.prompt.length > 50 ? `${image.prompt.substring(0, 50)}...` : image.prompt}
                              </td>
                            )}
                            <td className="px-6 py-4">
                              {image.imageUrl ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  Processing
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                {image.imageUrl && (
                                  <>
                                    <button
                                      onClick={() => handleImageClick(image)}
                                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                                      aria-label="Enlarge"
                                      title="Enlarge"
                                    >
                                      ⛶
                                    </button>
                                    <a
                                      href={image.imageUrl}
                                      download={`flux_image_${image.id}.png`}
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
                                    <button
                                      onClick={() => handleTrashImage(image.id)}
                                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 dark:text-red-300 dark:bg-red-900 dark:hover:bg-red-800"
                                      title="Trash image"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Info */}
                  {generatedImages.length > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
                      Showing {Math.min((currentPage - 1) * imagesPerPage + 1, generatedImages.length)} to {Math.min(currentPage * imagesPerPage, generatedImages.length)} of {generatedImages.length} generations
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {generatedImages.length > imagesPerPage && (
                    <div className="flex justify-center items-center space-x-4 mt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      <div className="flex space-x-2">
                        {Array.from({ length: Math.ceil(generatedImages.length / imagesPerPage) }, (_, i) => i + 1)
                          .map((page) => (
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
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(generatedImages.length / imagesPerPage)))}
                        disabled={currentPage === Math.ceil(generatedImages.length / imagesPerPage)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {generatedImages.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No generation history yet. Generate your first image to see it here.
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column - Buy More Credits */}
              <div className="space-y-6">
                {/* Saved Payment Methods */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Saved Payment Methods</h2>
                  {pmLoading ? (
                    <p className="text-gray-700 dark:text-gray-300">Loading payment methods…</p>
                  ) : pmError ? (
                    <p className="text-red-600 dark:text-red-400">{pmError}</p>
                  ) : paymentMethods.length === 0 ? (
                    <div className="text-gray-700 dark:text-gray-300">
                      <p>No saved cards yet.</p>
                      <p className="mt-2">
                        <a href="/profile" className="text-blue-600 hover:underline">Add a payment method</a> in your Profile.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.map(pm => (
                        <div key={pm.id} className={`flex items-center justify-between p-3 rounded-md border ${pm.is_default ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'}`}>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {pm.brand?.toUpperCase() || 'CARD'} •••• {pm.last4}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">Exp {String(pm.exp_month).padStart(2, '0')}/{String(pm.exp_year).slice(-2)}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {pm.is_default ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Default</span>
                            ) : (
                              <button onClick={() => setDefaultPaymentMethod(pm.id)} className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                                Make Default
                              </button>
                            )}
                            <button onClick={() => deletePaymentMethod(pm.id)} className="px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 text-sm text-gray-700 dark:text-gray-300">
                        Prefer a different card? <a href="/profile" className="text-blue-600 hover:underline">Manage cards</a>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Buy More Credits</h2>
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    Need more credits? Choose from our packages below.
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    {creditPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`relative bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 transition-all duration-200 ${
                          selectedPackage === pkg.id
                            ? 'border-blue-500 ring-2 ring-blue-400'
                            : pkg.popular
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                              : 'border-gray-200'
                        } hover:border-blue-500 hover:ring-2 hover:ring-blue-300`}
                      >
                        {pkg.popular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                              Most Popular
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{pkg.name}</h3>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pkg.credits} credits</div>
                            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">${pkg.price}</div>
                          </div>
                            <button
                              onClick={() => (session ? handlePurchase(pkg.id) : router.push('/auth/signin'))}
                              disabled={isProcessing}
                              className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-500 ${
                                pkg.popular
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-gray-700 hover:bg-gray-800 text-white'
                              }`}
                            >
                              {isProcessing ? 'Processing...' : (session ? 'Buy' : 'Sign In to Buy')}
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact our support team for assistance with credit purchases.
          </p>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeLightbox}>
          <div className="relative max-w-4xl max-h-full flex items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage((prev) => {
                  if (!prev) return prev;
                  const idx = generatedImages.findIndex((img) => img.id === prev.id);
                  if (idx === -1) return prev;
                  let newIndex = (idx - 1 + generatedImages.length) % generatedImages.length;
                  return generatedImages[newIndex];
                });
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
                setSelectedImage((prev) => {
                  if (!prev) return prev;
                  const idx = generatedImages.findIndex((img) => img.id === prev.id);
                  if (idx === -1) return prev;
                  let newIndex = (idx + 1) % generatedImages.length;
                  return generatedImages[newIndex];
                });
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
                const year = date.getFullYear().toString().slice(-2);
                const hours24 = date.getHours();
                const hours12 = hours24 % 12 || 12;
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours24 >= 12 ? 'PM' : 'AM';
                return `${month}.${day}.${year} ${hours12}:${minutes} ${ampm}`;
              })()}
            </p>
            <div className="flex space-x-3">
              <a
                href={selectedImage.imageUrl}
                download={`flux_image_${selectedImage.id}.png`}
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
                onClick={() => handleTrashImage(selectedImage.id)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-400 bg-red-900 bg-opacity-50 rounded-md hover:bg-opacity-75 transition-all"
              >
                🗑️ Trash Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No checkout modal; purchases use saved billing off-session */}
    </div>
  );
}

export default CreditsPageWrapper;
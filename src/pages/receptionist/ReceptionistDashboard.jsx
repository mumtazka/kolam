import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LogOut, Printer, Plus, Minus, Ticket, User, ChevronDown, X, Eye, ScanLine } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import QRCode from '../../components/ui/QRCode';
import { toast } from 'sonner';

// Import Supabase services
import { getActiveCategoriesWithPrices, parseSessionMetadata } from '../../services/categoryService';
import { createBatchTickets } from '../../services/ticketService';
import { getTicketPackages } from '../../services/adminService';

const ReceptionistDashboard = () => {
  const { user, logout, switchMode } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [nimInputs, setNimInputs] = useState({}); // { category_id: ['nim1', 'nim2', ...] }
  const [nimErrors, setNimErrors] = useState({}); // { 'category_id-index': 'error message' }
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [printedTickets, setPrintedTickets] = useState([]);
  const [currentShift, setCurrentShift] = useState('Pagi');
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // New state to track if we are in preview mode

  // Package Logic States
  const [ticketPackages, setTicketPackages] = useState([]);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [selectedCategoryForPackage, setSelectedCategoryForPackage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-initialize NIM arrays when cart quantity changes for requires_nim items
  useEffect(() => {
    const newNimInputs = { ...nimInputs };
    let changed = false;

    cart.forEach(item => {
      if (item.requires_nim) {
        const qty = Number(item.quantity) || 0;
        const currentNims = nimInputs[item.category_id] || [];

        if (currentNims.length !== qty) {
          // Adjust array size to match quantity
          if (qty > currentNims.length) {
            // Add empty slots
            newNimInputs[item.category_id] = [...currentNims, ...Array(qty - currentNims.length).fill('')];
          } else {
            // Trim array
            newNimInputs[item.category_id] = currentNims.slice(0, qty);
          }
          changed = true;
        }
      }
    });

    if (changed) {
      setNimInputs(newNimInputs);
    }
  }, [cart]);

  // Validate for duplicate NIMs across all categories
  useEffect(() => {
    validateNimDuplicates();
  }, [nimInputs]);

  const fetchData = async () => {
    try {
      const [categoriesData, packagesData] = await Promise.all([
        getActiveCategoriesWithPrices(),
        getTicketPackages()
      ]);
      setCategories(categoriesData);
      setTicketPackages(packagesData.filter(p => p.is_active));
    } catch (error) {
      toast.error(t('common.error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Collect all NIMs from all categories
  const getAllNims = () => {
    const allNims = [];
    cart.forEach(item => {
      if (item.requires_nim) {
        const nims = nimInputs[item.category_id] || [];
        nims.forEach((nim, index) => {
          if (nim?.trim()) {
            allNims.push({
              categoryId: item.category_id,
              index,
              nim: nim.trim().toUpperCase()
            });
          }
        });
      }
    });
    return allNims;
  };

  // Validate for duplicate NIMs
  const validateNimDuplicates = () => {
    const allNims = getAllNims();
    const errors = {};

    allNims.forEach((entry, i) => {
      const isDuplicate = allNims.some((other, j) =>
        i !== j && entry.nim === other.nim
      );

      if (isDuplicate) {
        errors[`${entry.categoryId}-${entry.index}`] = 'NIM sudah digunakan';
      }
    });

    setNimErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if there are any NIM errors
  const hasNimErrors = () => Object.keys(nimErrors).length > 0;

  // Update specific NIM in array
  const updateNimAtIndex = (categoryId, index, value) => {
    const currentNims = nimInputs[categoryId] || [];
    const newNims = [...currentNims];
    newNims[index] = value;
    setNimInputs({ ...nimInputs, [categoryId]: newNims });
  };

  const addToCart = (category) => {
    addItemToCart(category);
  };

  const addItemToCart = (category, packageItem = null) => {
    // Generate unique Key for cart item (Category + Package combination)
    // If package is used, we treat it as a separate item in the cart
    const cartItemId = packageItem
      ? `${category.id}-${packageItem.id}`
      : category.id;

    const existingItem = cart.find(item => item.unique_id === cartItemId);

    if (existingItem) {
      // If item exists, just increment quantity (respecting logic elsewhere)
      setCart(cart.map(item =>
        item.unique_id === cartItemId
          ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
          : item
      ));
    } else {
      // New Item
      setCart([...cart, {
        unique_id: cartItemId,
        category_id: category.id,
        category_name: category.name,
        quantity: packageItem ? packageItem.min_people : 1, // Default to min items
        price: packageItem ? packageItem.price_per_person : category.price,
        requires_nim: category.requires_nim,

        // Package Metadata
        package_id: packageItem ? packageItem.id : null,
        package_name: packageItem ? packageItem.name : null,
        min_quantity: packageItem ? packageItem.min_people : 1
      }]);
    }

    if (packageDialogOpen) setPackageDialogOpen(false);
    if (selectedCategoryForPackage) setSelectedCategoryForPackage(null);
  };

  const handlePackageSelect = (pkg) => {
    addItemToCart(selectedCategoryForPackage, pkg);
  };

  const handleNoPackageSelect = () => {
    addItemToCart(selectedCategoryForPackage, null);
  };

  // For Buttons (+/-) - Removes item if quantity drops to 0 or less
  const adjustQuantity = (uniqueId, delta) => {
    setCart(cart.map(item => {
      if (item.unique_id === uniqueId) {
        const currentQty = Number(item.quantity) || 0;
        const newQty = currentQty + delta;

        // Enforce Min Quantity for Packages
        if (item.package_id && newQty < item.min_quantity) {
          toast.error(`Minimum ${item.min_quantity} orang untuk paket ini`);
          return item;
        }

        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  // For Text Input - Allows empty or 0 temporarily while typing
  const handleQuantityInput = (uniqueId, value) => {
    if (value === '') {
      setCart(cart.map(item =>
        item.unique_id === uniqueId ? { ...item, quantity: '' } : item
      ));
      return;
    }

    const newQty = parseInt(value);
    if (!isNaN(newQty) && newQty >= 0) {
      setCart(cart.map(item =>
        item.unique_id === uniqueId ? { ...item, quantity: newQty } : item
      ));
    }
  };

  // Reset to 1 (or Min) if left empty or invalid on blur
  const handleInputBlur = (uniqueId) => {
    setCart(cart.map(item => {
      if (item.unique_id === uniqueId) {
        const qty = Number(item.quantity);
        const minQty = item.min_quantity || 1;

        if (item.quantity === '' || isNaN(qty) || qty < minQty) {
          if (qty < minQty && !isNaN(qty)) {
            toast.error(`Auto-set ke minimum: ${minQty}`);
          }
          return { ...item, quantity: minQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (uniqueId) => {
    const item = cart.find(i => i.unique_id === uniqueId);
    setCart(cart.filter(item => item.unique_id !== uniqueId));

    // Clean up NIMs
    if (item) {
      const newNimInputs = { ...nimInputs };
      delete newNimInputs[item.category_id]; // Note: This clears NIMs for category.
      setNimInputs(newNimInputs);
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * (Number(item.quantity) || 0)), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  };

  const validateCart = () => {
    for (const item of cart) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) {
        toast.error(`${t('scanner.quantityInvalid')} ${item.category_name}`);
        return false;
      }
      if (item.requires_nim) {
        const nims = nimInputs[item.category_id] || [];
        for (let i = 0; i < qty; i++) {
          if (!nims[i]?.trim()) {
            toast.error(`NIM ${i + 1} ${t('common.required')} untuk ${item.category_name}`);
            return false;
          }
        }
      }
    }

    if (hasNimErrors()) {
      toast.error('Ada NIM yang duplikat. Setiap tiket mahasiswa harus menggunakan NIM yang berbeda.');
      return false;
    }

    return true;
  };

  const handleProcessTickets = async () => {
    if (!validateCart()) return;

    setPrinting(true);
    try {
      const ticketItems = cart.map(item => ({
        category_id: item.category_id,
        quantity: Number(item.quantity) || 1,
        // Include Package Data
        package_id: item.package_id || null,
        // Map NIMs - MUST be an array (even empty) for Supabase RPC
        nims: item.requires_nim ? (nimInputs[item.category_id] || []).map(n => n?.trim()) : []
      }));

      const result = await createBatchTickets(ticketItems, user, currentShift);
      setPrintedTickets(result.tickets);
      toast.success(`${result.total_tickets} ${t('dashboard.printSuccess')}`);

      // DIRECT PRINT: Skip modal, just print
      // We need a small timeout to allow React to render the printedTickets into the hidden print container
      setTimeout(() => {
        window.print();

        // Clear cart after printing dialog is likely opened/closed
        // 1 second delay to be safe
        setTimeout(() => {
          setCart([]);
          setNimInputs({});
          setPrintedTickets([]);
        }, 1000);
      }, 500);

    } catch (error) {
      console.error(error);
      toast.error(t('dashboard.printError') + ': ' + error.message);
    } finally {
      setPrinting(false);
    }
  };

  const handlePreviewTickets = () => {
    if (!validateCart()) return;

    // Generate PREVIEW tickets (not saved to DB)
    const previewTickets = [];
    const now = new Date();

    cart.forEach(item => {
      const qty = Number(item.quantity) || 1;
      const nims = item.requires_nim ? (nimInputs[item.category_id] || []) : [];

      for (let i = 0; i < qty; i++) {
        previewTickets.push({
          id: `preview-${item.unique_id}-${i}`,
          category_name: item.category_name,
          ticket_code: 'PREVIEW',
          price: item.price,
          nim: nims[i] || null,
          created_at: now.toISOString(),
          is_preview: true
        });
      }
    });

    setPrintedTickets(previewTickets);
    setIsPreviewMode(true);
    setShowPreview(true);
  };

  const handlePrintConfirm = () => {
    window.print();
    // Close preview and clear cart after a delay to allow print dialog to open
    setTimeout(() => {
      setShowPreview(false);
      setCart([]);
      setNimInputs({});
      setPrintedTickets([]);
      setIsPreviewMode(false); // Reset mode
    }, 1000);
  };

  const renderCartContent = (isMobile = false) => {
    if (cart.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400 flex-1 flex flex-col justify-center">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{t('dashboard.noTicketsSelected')}</p>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-3 flex-1 overflow-auto pb-4 px-1">
          {cart.map(item => (
            <Card key={item.unique_id} className="p-3 border-slate-200 shadow-none bg-slate-50/50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-900 block">{item.category_name}</span>
                    {item.package_name && (
                      <span className="text-xs font-bold text-teal-600 bg-teal-50 px-1 rounded flex items-center mt-0.5">
                        <Ticket className="w-3 h-3 mr-1" />
                        {item.package_name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.unique_id)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-white rounded-md border border-slate-200">
                    <button
                      className="p-2 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
                      onClick={() => adjustQuantity(item.unique_id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    {/* Manually Enterable Input */}
                    <input
                      type="number"
                      className="w-10 text-center border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 appearance-none bg-transparent focus:outline-none"
                      value={item.quantity}
                      onChange={(e) => handleQuantityInput(item.unique_id, e.target.value)}
                      onBlur={() => handleInputBlur(item.unique_id)}
                    />
                    <button
                      className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                      onClick={() => adjustQuantity(item.unique_id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm text-slate-900 block">
                      Rp {(item.price * (Number(item.quantity) || 0)).toLocaleString('id-ID')}
                    </span>
                    {/* Show breakdown if package */}
                    {item.package_id && (
                      <span className="text-[10px] text-slate-500">
                        {item.quantity} x @{item.price.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>

                {item.requires_nim && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-slate-500 font-medium">
                      {Number(item.quantity) > 1
                        ? t('dashboard.enterNimPlural').replace('{{count}}', item.quantity)
                        : t('dashboard.enterNimSingle')}
                    </p>
                    {Array.from({ length: Number(item.quantity) || 1 }).map((_, index) => {
                      const errorKey = `${item.category_id}-${index}`;
                      const hasError = nimErrors[errorKey];
                      const nimArray = nimInputs[item.category_id] || [];
                      return (
                        <div key={index}>
                          <div className="flex items-center gap-2">
                            {Number(item.quantity) > 1 && (
                              <span className="text-xs text-slate-400 w-4">{index + 1}.</span>
                            )}
                            <Input
                              placeholder={`${t('dashboard.nimPlaceholder')} ${Number(item.quantity) > 1 ? index + 1 : ''}`}
                              value={nimArray[index] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*$/.test(val)) {
                                  updateNimAtIndex(item.category_id, index, val);
                                }
                              }}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className={`h-8 text-xs bg-white flex-1 ${hasError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                            />
                          </div>
                          {hasError && (
                            <p className="text-xs text-rose-500 mt-1 ml-6">⚠️ {nimErrors[errorKey]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className={`pt-4 border-t-2 border-slate-100 mt-auto ${isMobile ? 'pb-6' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-base font-semibold text-slate-600">{t('dashboard.total')}</span>
            <span className="text-2xl font-bold text-slate-900">Rp {getTotalAmount().toLocaleString('id-ID')}</span>
          </div>
          {hasNimErrors() && (
            <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-md">
              <p className="text-xs text-rose-600 font-medium">⚠️ {t('dashboard.duplicateNimError')}</p>
            </div>
          )}
          {/* Actions: Preview & Checkout */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePreviewTickets}
              disabled={printing || cart.length === 0 || hasNimErrors()}
              className="w-12 h-12 bg-white border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
              title={t('scanner.ticketPreview')}
            >
              <Eye className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleProcessTickets}
              disabled={printing || cart.length === 0 || hasNimErrors()}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-base font-semibold shadow-xl shadow-slate-200 disabled:opacity-50 text-white"
            >
              <Printer className="w-5 h-5 mr-2" />
              {printing ? t('scanner.processing') : t('dashboard.checkout')}
            </Button>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full bg-slate-50 print:hidden" data-testid="receptionist-dashboard">
        {/* Header removed - using Layout Header */}

        <div className="flex h-full flex-col lg:flex-row">
          {/* Left Panel - Ticket Selection */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{t('dashboard.clickToSelect')}</h2>
              {/* Shift Selector has been REMOVED as requested */}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {categories.length === 0 && <p className="col-span-full text-center text-slate-500 py-10">{t('dashboard.noActiveCategories')}</p>}
              {categories.map(category => {

                // Session Ticket Logic
                const isSessionTicket = !!(category.session_id || category.sessions);
                const sessionMetadata = parseSessionMetadata(category.description);
                const isOneTime = category.booking_date ? true : (sessionMetadata ? !sessionMetadata.is_recurring : false);

                return (
                  <Card
                    key={category.id}
                    className={`p-4 cursor-pointer ticket-category-card transition-all shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px] ${isSessionTicket
                      ? 'border-2 border-teal-500 bg-teal-50/30'
                      : 'hover:border-teal-500'
                      }`}
                    onClick={() => addToCart(category)}
                    data-testid={`ticket-category-${category.id}`}
                  >
                    {/* Session Badge - Absolute Positioned */}
                    {isSessionTicket && (
                      <div className="absolute top-0 right-0 z-10">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 text-white text-[10px] font-bold rounded-bl-xl shadow-sm">
                          <Ticket className="w-3 h-3" />
                          Tiket Khusus
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-2 mt-1">
                      <div>
                        <h3 className="text-base font-bold leading-tight pr-8 text-slate-900">{category.name}</h3>
                        <p className="text-xs mt-1 line-clamp-1 text-slate-500">{category.description}</p>

                        {/* Show One-time badge inline here if needed, or below title */}
                        {isSessionTicket && isOneTime && (
                          <span className="inline-flex mt-1 items-center px-1.5 py-0.5 bg-amber-100/80 text-amber-700 text-[9px] font-semibold rounded border border-amber-200">
                            Satu Kali
                          </span>
                        )}
                      </div>

                      {/* Standard Code Block - Visible for all, consistent layout */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${isSessionTicket
                        ? 'bg-teal-100 text-teal-700 mt-6' // Push down slightly to avoid badge
                        : 'bg-slate-100 text-slate-500'
                        }`}>
                        {category.code_prefix}
                      </div>
                    </div>
                    <div className={`flex items-center justify-between mt-auto pt-3 border-t ${isSessionTicket ? 'border-teal-200' : 'border-slate-100'
                      }`}>
                      <span className="text-lg font-bold text-slate-900">
                        Rp {category.price.toLocaleString('id-ID')}
                      </span>
                      <Button size="icon" className={`h-7 w-7 rounded-full ${isSessionTicket
                        ? 'bg-teal-600 hover:bg-teal-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800'
                        }`}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Cart (Basket) - Hidden on mobile, fixed bottom bar instead */}
          <div className="hidden lg:flex w-96 bg-white border-l border-slate-200 p-6 overflow-auto flex-col shadow-lg z-10">
            {/* Basket Header - Updated */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                {t('dashboard.total')} {t('dashboard.tickets')}
              </h2>
              <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-lg font-bold">
                {getTotalItems()}
              </div>
            </div>

            {renderCartContent(false)}
          </div>
        </div>

        {/* Mobile Cart Bar - Fixed bottom */}
        {cart.length > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50 cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-bold">
                      {getTotalItems()} tiket
                    </div>
                    <span className="text-lg font-bold text-slate-900">Rp {getTotalAmount().toLocaleString('id-ID')}</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Detail / Bayar
                  </Button>
                </div>
              </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-xl">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left font-bold text-xl flex items-center justify-between">
                  <span>Keranjang Tiket</span>
                  <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-bold">
                    {getTotalItems()} Item
                  </div>
                </SheetTitle>
              </SheetHeader>
              {renderCartContent(true)}
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Ticket Preview Modal - Portaled to Body to avoid Layout Clipping */}
      {
        showPreview && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {t('scanner.ticketPreview')}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {t('scanner.reviewTickets')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 bg-slate-700" style={{ minHeight: 0 }}>
                <div className="flex flex-wrap gap-6 justify-center">
                  {printedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-white flex flex-col items-center justify-between shadow-2xl"
                      style={{
                        width: '302px',
                        height: '302px',
                        padding: '16px', // Scaled up slightly for screen visibility, roughly 4mm
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Header */}
                      <div className="text-center w-full">
                        <h2 className="text-sm font-bold text-black uppercase leading-none">Kolam Renang UNY</h2>
                        <h3 className="text-[10px] font-semibold text-black uppercase leading-none mt-1">{ticket.category_name}</h3>
                      </div>

                      {/* QR Code - Centered */}
                      <div className="flex justify-center" style={{ margin: '8px auto' }}>
                        <QRCode value={ticket.ticket_code} size={100} /> {/* Kept slightly larger for screen readability, printed is 80 */}
                      </div>

                      {/* Details */}
                      <div className="w-full font-mono text-[9px] text-black uppercase leading-tight">
                        <div className="flex justify-between">
                          <span>{t('common.code')}:</span>
                          <span className="font-bold">{ticket.ticket_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('dashboard.price')}:</span>
                          <span>Rp {ticket.price.toLocaleString('id-ID')}</span>
                        </div>
                        {ticket.nim && (
                          <div className="flex justify-between">
                            <span>NIM:</span>
                            <span className="font-bold">{ticket.nim}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>{t('common.date')}:</span>
                          <span>{new Date(ticket.created_at).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="text-center pt-2 border-t border-black border-dashed w-full">
                        <p className="font-bold text-[8px] text-black leading-tight">{t('scanner.ticketValidOneTime')}</p>
                        <p className="text-[8px] text-black leading-tight">{t('scanner.ticketNoRefund')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  {isPreviewMode ? 'Tutup' : t('common.cancel')}
                </Button>
                {!isPreviewMode && (
                  <Button onClick={handlePrintConfirm} className="bg-slate-900 hover:bg-slate-800 min-w-[150px]">
                    <Printer className="w-4 h-4 mr-2" />
                    {t('scanner.confirmPrint')}
                  </Button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Package Selection Dialog */}
      {
        packageDialogOpen && selectedCategoryForPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden transform transition-all scale-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>{t('dashboard.selectSpecialTicket')}</h3>
                  <p className="text-sm text-slate-300 mt-1">{t('dashboard.selectPackageDescription')}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPackageDialogOpen(false)} className="text-white hover:bg-slate-800 rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                <div className="space-y-4">


                  {/* Option 2: Packages */}
                  {ticketPackages.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 italic">{t('dashboard.noPackagesAvailable')}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ticketPackages.map(pkg => (
                        <div
                          key={pkg.id}
                          onClick={() => handlePackageSelect(pkg)}
                          className="bg-white p-4 rounded-xl border-2 border-teal-100 hover:border-teal-600 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 bg-teal-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                            {t('dashboard.saverPackage')}
                          </div>

                          <div className="mb-3">
                            <h4 className="font-bold text-lg text-teal-950 group-hover:text-teal-700">{pkg.name}</h4>
                            <p className="text-xs text-teal-600/80 font-medium">{pkg.description}</p>
                          </div>

                          <div className="space-y-1 text-sm text-slate-600">
                            <p className="flex justify-between">
                              <span>{t('dashboard.minPeople')}:</span>
                              <span className="font-bold text-slate-900">{pkg.min_people} {t('dashboard.people')}</span>
                            </p>
                            <p className="flex justify-between">
                              <span>{t('dashboard.packagePrice')}:</span>
                              <span className="font-bold text-teal-600">Rp {pkg.price_per_person.toLocaleString('id-ID')}</span>
                            </p >
                          </div >
                        </div >
                      ))}
                    </div >
                  )}
                </div >
              </div >
            </div >
          </div >
        )
      }

      {/* 57mm Thermal Print Template - Portaled to Body to avoid Layout Clipping */}
      {createPortal(
        <div className="print-container hidden print:block text-black">
          <style type="text/css" media="print">
            {`
               @page { 
                 size: 80mm 100mm; 
                 margin: 0; 
               }
               
               html, body { 
                 width: 80mm !important; 
                 height: 100mm !important;
                 margin: 0 !important; 
                 padding: 0 !important;
                 overflow: hidden !important;
                 font-family: 'Inter', sans-serif;
                 background: white !important;
               }
               
               .print-container {
                 position: absolute;
                 top: 0;
                 left: 0;
                 width: 80mm !important;
                 margin: 0 !important;
                 padding: 0 !important;
                 display: block !important;
                 background: white !important;
                 z-index: 99999 !important;
               }
  
               .printable-ticket { 
                 width: 80mm !important;
                 height: 100mm !important;
                 max-height: 100mm !important;
                 padding: 2mm 5mm !important; 
                 margin: 0 !important;
                 box-sizing: border-box !important;
                 border: none !important;
                 display: flex !important;
                 flex-direction: column;
                 justify-content: flex-start;
                 align-items: center;
                 gap: 2px !important;
                 overflow: hidden !important;
                 page-break-after: always !important; 
                 page-break-inside: avoid !important;
                 break-after: page !important;
                 break-inside: avoid !important;
                 background: white !important;
                 box-shadow: none !important;
               }
  
               .printable-ticket:last-child {
                 page-break-after: auto !important;
                 break-after: auto !important;
               }
               
               .printable-ticket * {
                 -webkit-print-color-adjust: exact !important;
                 print-color-adjust: exact !important;
                 color: black !important;
               }
             `}
          </style>

          {printedTickets.map((ticket) => {
            return (
              <div key={ticket.id} className="printable-ticket">
                {/* Header - Venue Info */}
                <div className="text-center w-full pb-1">
                  <h2 className="text-[12px] font-bold leading-tight text-black" style={{ fontFamily: 'Inter, sans-serif' }}>Kolam Renang</h2>
                  <h2 className="text-[12px] font-bold leading-tight text-black" style={{ fontFamily: 'Inter, sans-serif' }}>Vokasi UNY</h2>
                  <p className="text-[9px] text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Jl Mandung, Pengasih, Kulon Progo</p>
                </div>

                {/* Receipt Label */}
                <div className="text-center w-full py-1">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>R E C E I P T</p>
                </div>

                {/* Category Name */}
                <div className="text-center w-full">
                  <p className="text-[12px] font-bold uppercase text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>{ticket.category_name}</p>
                </div>

                {/* Price Calculation */}
                <div className="w-full px-6 py-0.5">
                  <div className="flex justify-between items-center text-[8px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="text-black leading-tight">Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')} x 1</span>
                    <span className="text-black font-medium leading-tight">Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="text-center w-full py-0.5">
                  <p className="text-[11px] font-bold text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Total: Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</p>
                </div>

                {/* Tax Note */}
                <div className="text-center w-full mb-0.5">
                  <p className="text-[8px] text-black font-medium leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Termasuk Pajak Hiburan 10%</p>
                </div>

                {/* QR Code */}
                <div className="tick-qr flex justify-center w-full py-1">
                  <QRCode
                    value={ticket.ticket_code}
                    size={140}
                  />
                </div>

                {/* Ticket Code - Under QR */}
                <div className="text-center w-full mt-0.5">
                  <p className="text-[8px] font-semibold text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>{ticket.ticket_code}</p>
                </div>

                {/* NIM if present */}
                {ticket.nim && (
                  <div className="text-center w-full">
                    <p className="text-[8px] text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>NIM: <span className="font-bold text-black">{ticket.nim}</span></p>
                  </div>
                )}

                {/* Footer - Contact Info */}
                <div className="text-center w-full pt-1 mt-auto border-t border-black">
                  <p className="text-[8px] font-semibold text-black leading-tight mb-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{user?.full_name || user?.email?.split('@')[0] || 'Staff'}</p>
                  <p className="text-[7px] text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>kolamrenangwates@uny.ac.id</p>
                  <p className="text-[7px] text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>IG: @kolamrenang_vokasiunywates</p>
                  <p className="text-[7px] text-black leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>0852-2562-0011</p>
                </div>

                {/* Timestamp */}
                <div className="text-center w-full pt-0.5">
                  <p className="text-[7px] text-black leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {new Date(ticket.created_at).toLocaleString('id-ID', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    }).replace(/\./g, ':')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default ReceptionistDashboard;
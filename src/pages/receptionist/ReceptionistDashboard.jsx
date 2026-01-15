import React, { useState, useEffect } from 'react';
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
import QRCode from '../../components/ui/QRCode';
import { toast } from 'sonner';

// Import Supabase services
import { getActiveCategoriesWithPrices } from '../../services/categoryService';
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
    // Logic for Special Ticket Packages
    if (category.code_prefix === 'K') { // 'K' is Khusus
      setSelectedCategoryForPackage(category);
      setPackageDialogOpen(true);
      return;
    }

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
                const isSpecial = category.code_prefix === 'K';
                return (
                  <Card
                    key={category.id}
                    className={`p-4 cursor-pointer ticket-category-card transition-colors shadow-sm ${isSpecial
                      ? 'bg-slate-900 text-white border-slate-700 hover:border-teal-500'
                      : 'hover:border-teal-500'
                      }`}
                    onClick={() => addToCart(category)}
                    data-testid={`ticket-category-${category.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className={`text-base font-bold ${isSpecial ? 'text-white' : 'text-slate-900'}`}>{category.name}</h3>
                        <p className={`text-xs mt-0.5 line-clamp-1 ${isSpecial ? 'text-slate-400' : 'text-slate-500'}`}>{category.description}</p>
                      </div>
                      <Ticket className={`w-6 h-6 ${isSpecial ? 'text-teal-400' : 'text-teal-500'} opacity-80`} />
                    </div>
                    <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isSpecial ? 'border-slate-800' : 'border-slate-100'}`}>
                      <span className={`text-lg font-bold ${isSpecial ? 'text-white' : 'text-slate-900'}`}>
                        {category.code_prefix === 'K' ? t('dashboard.selectPackage') : `Rp ${category.price.toLocaleString('id-ID')}`}
                      </span>
                      <Button size="icon" className={`h-7 w-7 rounded-full ${isSpecial ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 hover:bg-slate-800'}`}>
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

            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex-1 flex flex-col justify-center">
                <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">{t('dashboard.noTicketsSelected')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 flex-1 overflow-auto pb-4">
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

                <div className="pt-4 border-t-2 border-slate-100 mt-auto">
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
            )}
          </div>
        </div>

        {/* Mobile Cart Bar - Fixed bottom */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-bold">
                  {getTotalItems()} tiket
                </div>
                <span className="text-lg font-bold text-slate-900">Rp {getTotalAmount().toLocaleString('id-ID')}</span>
              </div>
              <Button
                onClick={handleProcessTickets}
                disabled={printing || hasNimErrors()}
                className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-sm font-semibold disabled:opacity-50 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                {printing ? '...' : 'Checkout'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
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

            <div className="p-8 overflow-y-auto flex-1 bg-slate-100/50">
              <div className="flex flex-wrap gap-8 justify-center">
                {printedTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white p-4 rounded-none shadow-md border border-slate-200 flex flex-col items-center justify-between relative overflow-hidden" style={{ width: '302px', height: '302px' }}>
                    {/* Cut lines */}
                    <div className="absolute -left-2 top-1/2 w-4 h-4 bg-slate-100 rounded-full"></div>
                    <div className="absolute -right-2 top-1/2 w-4 h-4 bg-slate-100 rounded-full"></div>

                    {/* Header */}
                    <div className="text-center w-full">
                      <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Kolam Renang UNY</h2>
                      <div className="w-full h-px bg-slate-200 my-1"></div>
                      <h3 className="text-base font-bold text-slate-800">{ticket.category_name}</h3>
                    </div>

                    {/* QR Code - constrained size */}
                    <div className="w-full flex justify-center py-1 overflow-hidden">
                      <QRCode value={ticket.ticket_code} size={80} />
                    </div>

                    {/* Details */}
                    <div className="w-full space-y-1 font-mono text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>{t('common.code')}:</span>
                        <span className="font-bold text-slate-900 text-[11px]">{ticket.ticket_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('dashboard.price')}:</span>
                        <span className="font-bold">Rp {ticket.price.toLocaleString('id-ID')}</span>
                      </div>
                      {ticket.nim && (
                        <div className="flex justify-between text-blue-600">
                          <span>NIM:</span>
                          <span className="font-bold">{ticket.nim}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{t('common.date')}:</span>
                        <span>{new Date(ticket.created_at).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t-2 border-dashed border-slate-200 text-center w-full">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('scanner.ticketValidOneTime')}</p>
                      <p className="text-[9px] text-slate-300">{t('scanner.ticketNoRefund')}</p>
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
        </div>
      )}

      {/* Package Selection Dialog */}
      {packageDialogOpen && selectedCategoryForPackage && (
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
      )}

      {/* 57mm Thermal Print Template */}
      <div className="print-container hidden print:block text-black">
        <style type="text/css" media="print">
          {`
             @page { size: 80mm 80mm; margin: 0; }
             html, body { 
               width: 80mm; 
               height: 80mm;
               margin: 0; 
               padding: 0; 
             }
             .print-container {
               width: 80mm;
               margin: 0;
               padding: 0;
               display: block;
               background: white;
             }

             .printable-ticket { 
               width: 80mm;
               height: 80mm;
               padding: 8px; 
               margin: 0;
               box-sizing: border-box;
               display: flex;
               flex-direction: column;
               justify-content: space-between;
               page-break-after: always; 
               break-after: page;
               border-bottom: 1px dashed #000; 
             }

             .printable-ticket:last-child {
               page-break-after: auto;
               break-after: auto;
               border-bottom: none;
             }
             
             .printable-ticket * {
               -webkit-print-color-adjust: exact;
               print-color-adjust: exact;
             }

             .printable-ticket.isSpecial {
                /* Remove black background for printing - printers don't print backgrounds by default */
                /* This ensures text is visible (black on white) instead of invisible (white on white) */
             }
             
             .printable-ticket.isSpecial .tick-h2, 
             .printable-ticket.isSpecial .tick-h3, 
             .printable-ticket.isSpecial .tick-val,
             .printable-ticket.isSpecial .tick-label,
             .printable-ticket.isSpecial p,
             .printable-ticket.isSpecial span,
             .printable-ticket.isSpecial h2,
             .printable-ticket.isSpecial h3 {
                /* Use default black text for printing */
                color: black !important;
             }
             
             .printable-ticket.isSpecial .tick-qr {
                background: white;
                padding: 4px;
                border-radius: 4px;
             }

             .printable-ticket.isSpecial .border-black {
                border-color: black !important;
             }
             
             .printable-ticket.isSpecial .bg-black {
                background-color: black !important;
             }
           `}
        </style>

        {printedTickets.map((ticket) => {
          // Identify if ticket is special (starts with K)
          // Check generated code or preview code (PREVIEW-K-...)
          const isSpecial = ticket.ticket_code.startsWith('K') || (ticket.ticket_code.startsWith('PREVIEW') && ticket.category_name.toLowerCase().includes('khusus'));

          return (
            <div key={ticket.id} className={`printable-ticket ${isSpecial ? 'isSpecial' : ''}`}>
              {/* Header */}
              <div className="text-center mb-1 px-1">
                <h2 className="text-base font-bold uppercase leading-tight">Kolam Renang UNY</h2>
                <h3 className="text-xs font-semibold mt-0.5 uppercase">{ticket.category_name}</h3>
              </div>

              {/* QR Code - Centered & Safe Range for 80mm */}
              <div className="tick-qr flex justify-center my-2 overflow-hidden" style={{ maxWidth: '70mm', margin: '8px auto' }}>
                <QRCode
                  value={ticket.ticket_code}
                  size={120}
                />
              </div>

              {/* Ticket Details */}
              <div className="space-y-0.5 font-mono text-[10px] uppercase px-1 leading-tight">
                <p className="flex justify-between"><span>{t('common.code')}:</span> <span className="font-bold">{ticket.ticket_code}</span></p>
                <p className="flex justify-between"><span>{t('dashboard.price')}:</span> <span>Rp {ticket.price.toLocaleString('id-ID')}</span></p>
                {ticket.nim && <p className="flex justify-between"><span>NIM:</span> <span className="font-bold">{ticket.nim}</span></p>}
                <p className="flex justify-between"><span>{t('common.date')}:</span> <span>{new Date(ticket.created_at).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
                  day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit'
                })}</span></p>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 mt-2 border-t border-black border-dashed mx-1">
                <p className="font-bold text-[9px]">{t('scanner.ticketValidOneTime')}</p>
                <p className="text-[9px]">{t('scanner.ticketNoRefund')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ReceptionistDashboard;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { LogOut, Printer, Plus, Minus, Ticket, User, ChevronDown, X, Eye, ScanLine } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import Barcode from '../../components/ui/Barcode';
import { toast } from 'sonner';

// Import Supabase services
import { getActiveCategoriesWithPrices } from '../../services/categoryService';
import { createBatchTickets } from '../../services/ticketService';

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
      const data = await getActiveCategoriesWithPrices();
      setCategories(data);
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
    const existingItem = cart.find(item => item.category_id === category.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.category_id === category.id
          ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        category_id: category.id,
        category_name: category.name,
        quantity: 1,
        price: category.price,
        requires_nim: category.requires_nim
      }]);
    }
  };

  // For Buttons (+/-) - Removes item if quantity drops to 0 or less
  const adjustQuantity = (categoryId, delta) => {
    setCart(cart.map(item => {
      if (item.category_id === categoryId) {
        const currentQty = Number(item.quantity) || 0;
        const newQty = currentQty + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  // For Text Input - Allows empty or 0 temporarily while typing
  const handleQuantityInput = (categoryId, value) => {
    if (value === '') {
      setCart(cart.map(item =>
        item.category_id === categoryId ? { ...item, quantity: '' } : item
      ));
      return;
    }

    const newQty = parseInt(value);
    if (!isNaN(newQty) && newQty >= 0) {
      setCart(cart.map(item =>
        item.category_id === categoryId ? { ...item, quantity: newQty } : item
      ));
    }
  };

  // Reset to 1 if left empty or 0 on blur
  const handleInputBlur = (categoryId) => {
    setCart(cart.map(item => {
      if (item.category_id === categoryId) {
        const qty = Number(item.quantity);
        if (item.quantity === '' || isNaN(qty) || qty <= 0) {
          return { ...item, quantity: 1 };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (categoryId) => {
    setCart(cart.filter(item => item.category_id !== categoryId));
    const newNimInputs = { ...nimInputs };
    delete newNimInputs[categoryId];
    setNimInputs(newNimInputs);
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

  const handlePreview = () => {
    if (!validateCart()) return;

    // Generate mock tickets for preview
    const mockTickets = [];
    cart.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const nims = nimInputs[item.category_id] || [];

      for (let i = 0; i < qty; i++) {
        mockTickets.push({
          id: `preview-${item.category_id}-${i}`,
          ticket_code: `PREVIEW-${item.category_name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
          category_name: item.category_name,
          price: item.price,
          nim: item.requires_nim ? nims[i] : null,
          created_at: new Date().toISOString()
        });
      }
    });

    setPrintedTickets(mockTickets);
    setShowPreview(true);
  };

  const handleProcessTickets = async () => {
    if (!validateCart()) return;

    setPrinting(true);
    try {
      const ticketItems = cart.map(item => ({
        category_id: item.category_id,
        quantity: Number(item.quantity) || 1,
        nims: item.requires_nim ? (nimInputs[item.category_id] || []).map(n => n?.trim()) : null
      }));

      const result = await createBatchTickets(ticketItems, user, currentShift);
      setPrintedTickets(result.tickets);
      toast.success(`${result.total_tickets} ${t('dashboard.printSuccess')}`);

      // Direct print execution
      setTimeout(() => {
        window.print();
        // Clean up after print dialog logic
        setTimeout(() => {
          setCart([]);
          setNimInputs({});
          setShowPreview(false);
        }, 500);
      }, 500);

    } catch (error) {
      console.error(error);
      toast.error(t('dashboard.printError') + ': ' + error.message);
    } finally {
      setPrinting(false);
    }
  };

  // Removed handlePrintConfirm as it is replaced by handleProcessTickets logic




  const handleLogout = () => {
    logout();
    navigate('/login');
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
      <div className="min-h-screen bg-slate-50 print:hidden" data-testid="receptionist-dashboard">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{t('auth.title')} - {t('admin.roleReceptionist')}</h1>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 border-slate-200">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-slate-700">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{t('admin.roleReceptionist')}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await switchMode('SCANNER');
                      navigate('/scanner');
                    } catch (e) {
                      toast.error(e.message);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  <span>{t('auth.switchMode')}: {t('auth.modeScanner')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>{t('common.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex h-[calc(100vh-73px)]">
          {/* Left Panel - Ticket Selection */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{t('dashboard.clickToSelect')}</h2>
              {/* Shift Selector has been REMOVED as requested */}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.length === 0 && <p className="col-span-full text-center text-slate-500 py-10">{t('dashboard.noActiveCategories')}</p>}
              {categories.map(category => (
                <Card
                  key={category.id}
                  className="p-4 cursor-pointer ticket-category-card hover:border-sky-500 transition-colors shadow-sm"
                  onClick={() => addToCart(category)}
                  data-testid={`ticket-category-${category.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{category.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{category.description}</p>
                    </div>
                    <Ticket className="w-6 h-6 text-sky-500 opacity-80" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-lg font-bold text-slate-900">Rp {category.price.toLocaleString()}</span>
                    <Button size="icon" className="h-7 w-7 rounded-full bg-slate-900 hover:bg-slate-800">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Panel - Cart (Basket) */}
          <div className="w-96 bg-white border-l border-slate-200 p-6 overflow-auto flex flex-col shadow-lg z-10">
            {/* Basket Header - Updated */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                {t('dashboard.total')} {t('dashboard.tickets')}
              </h2>
              <div className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-lg font-bold">
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
                    <Card key={item.category_id} className="p-3 border-slate-200 shadow-none bg-slate-50/50">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-slate-900">{item.category_name}</span>
                          <button
                            onClick={() => removeFromCart(item.category_id)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-white rounded-md border border-slate-200">
                            <button
                              className="p-2 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
                              onClick={() => adjustQuantity(item.category_id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            {/* Manually Enterable Input */}
                            <input
                              type="number"
                              className="w-10 text-center border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 appearance-none bg-transparent focus:outline-none"
                              value={item.quantity}
                              onChange={(e) => handleQuantityInput(item.category_id, e.target.value)}
                              onBlur={() => handleInputBlur(item.category_id)}
                            />
                            <button
                              className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                              onClick={() => adjustQuantity(item.category_id, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-semibold text-sm text-slate-900">
                            Rp {(item.price * (Number(item.quantity) || 0)).toLocaleString()}
                          </span>
                        </div>

                        {item.requires_nim && (
                          <div className="space-y-2 mt-2">
                            <p className="text-xs text-slate-500 font-medium">
                              {Number(item.quantity) > 1
                                ? `Masukkan ${item.quantity} NIM berbeda:`
                                : 'Masukkan NIM Mahasiswa:'}
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
                                      placeholder={`NIM Mahasiswa ${Number(item.quantity) > 1 ? index + 1 : ''}`}
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
                    <span className="text-2xl font-bold text-slate-900">Rp {getTotalAmount().toLocaleString()}</span>
                  </div>
                  {hasNimErrors() && (
                    <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-md">
                      <p className="text-xs text-rose-600 font-medium">⚠️ Ada NIM yang duplikat. Setiap tiket mahasiswa harus menggunakan NIM yang berbeda.</p>
                    </div>
                  )}
                  {/* Actions: Preview & Checkout */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handlePreview}
                      disabled={printing || cart.length === 0 || hasNimErrors()}
                      className="h-12 w-12 p-0 flex-shrink-0 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title={t('scanner.ticketPreview')}
                    >
                      <Eye className="w-5 h-5" />
                    </Button>

                    <Button
                      onClick={handleProcessTickets}
                      disabled={printing || cart.length === 0 || hasNimErrors()}
                      className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-base font-semibold shadow-xl shadow-slate-200 disabled:opacity-50"
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

        {/* Ticket Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('scanner.ticketPreview')}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t('scanner.reviewTickets')}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 bg-slate-100/50">
                <div className="flex flex-wrap gap-8 justify-center">
                  {printedTickets.map((ticket) => (
                    <div key={ticket.id} className="bg-white p-6 rounded-none shadow-md border border-slate-200 w-[300px] flex flex-col items-center relative">
                      {/* Cut lines */}
                      <div className="absolute -left-2 top-1/2 w-4 h-4 bg-slate-100 rounded-full"></div>
                      <div className="absolute -right-2 top-1/2 w-4 h-4 bg-slate-100 rounded-full"></div>

                      <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">Kolam Renang UNY</h2>
                        <div className="w-full h-px bg-slate-200 my-2"></div>
                        <h3 className="text-lg font-bold text-slate-800">{ticket.category_name}</h3>
                      </div>

                      <div className="my-2 w-full flex justify-center py-2 bg-white">
                        <Barcode value={ticket.ticket_code} width={1.5} height={50} displayValue={false} />
                      </div>

                      <div className="w-full space-y-2 font-mono text-sm text-slate-600 mt-2">
                        <div className="flex justify-between">
                          <span>Code:</span>
                          <span className="font-bold text-slate-900">{ticket.ticket_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-bold">Rp {ticket.price.toLocaleString()}</span>
                        </div>
                        {ticket.nim && (
                          <div className="flex justify-between text-blue-600">
                            <span>NIM:</span>
                            <span className="font-bold">{ticket.nim}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{t('admin.date')}:</span>
                          <span>{new Date(ticket.created_at).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200 text-center w-full">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('scanner.ticketValidOneTime')}</p>
                        <p className="text-[10px] text-slate-300 mt-1">{t('scanner.ticketNoRefund')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowPreview(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleProcessTickets} disabled={printing} className="bg-slate-900 hover:bg-slate-800 min-w-[150px]">
                  <Printer className="w-4 h-4 mr-2" />
                  {printing ? t('scanner.processing') : t('scanner.confirmPrint')}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 57mm Thermal Print Template */}
      <div className="print-container hidden print:block text-black">
        <style type="text/css" media="print">
          {`
             @page { size: 57mm auto; margin: 0; }
             html, body { 
               width: 57mm; 
               height: auto;
               margin: 0; 
               padding: 0; 
             }
             /* Ensure no other layout interferes */
             /* Removed body direct child selector that hides root */

             .print-container {
               width: 57mm;
               margin: 0;
               padding: 0;
               display: block;
               background: white;
             }

             .printable-ticket { 
               width: 57mm;
               /* Minimal padding to maximize space, thermal printers often have hardware margins */
               padding: 5px 0; 
               margin: 0;
               box-sizing: border-box;
               display: block;
               page-break-after: always; 
               break-after: page;
               border-bottom: 1px dashed #000; /* Visual separator */
             }

             .printable-ticket:last-child {
               page-break-after: auto;
               break-after: auto;
               border-bottom: none;
             }
             
             /* Reset typography for print */
             .printable-ticket * {
               -webkit-print-color-adjust: exact;
               print-color-adjust: exact;
             }
           `}
        </style>

        {printedTickets.map((ticket) => (
          <div key={ticket.id} className="printable-ticket">
            {/* Header */}
            <div className="text-center mb-1 px-1">
              <h2 className="text-base font-bold uppercase leading-tight">Kolam Renang UNY</h2>
              <h3 className="text-xs font-semibold mt-0.5 uppercase">{ticket.category_name}</h3>
            </div>

            {/* Barcode - Centered & Safe Range */}
            <div className="flex justify-center my-1 overflow-hidden" style={{ maxWidth: '48mm', margin: '0 auto' }}>
              <Barcode
                value={ticket.ticket_code}
                width={0.6}
                height={35}
                fontSize={9}
                displayValue={false}
                margin={0}
              />
            </div>

            {/* Ticket Details */}
            <div className="space-y-0.5 font-mono text-[10px] uppercase px-1 leading-tight">
              <p className="flex justify-between"><span>CODE:</span> <span className="font-bold">{ticket.ticket_code}</span></p>
              <p className="flex justify-between"><span>PRICE:</span> <span>Rp {ticket.price.toLocaleString()}</span></p>
              {ticket.nim && <p className="flex justify-between"><span>NIM:</span> <span className="font-bold">{ticket.nim}</span></p>}
              <p className="flex justify-between"><span>DATE:</span> <span>{new Date(ticket.created_at).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
                day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit'
              })}</span></p>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 mt-2 border-t border-black border-dashed mx-1">
              <p className="font-bold text-[9px]">{t('scanner.ticketValidOneTime')}</p>
              <p className="text-[9px]">{t('scanner.ticketNoRefund')}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ReceptionistDashboard;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { LogOut, Printer, Plus, Minus, ShoppingCart, Ticket, Clock } from 'lucide-react';
import { toast } from 'sonner';

// Import Supabase services
import { getCategoriesWithPrices } from '../../services/categoryService';
import { createBatchTickets } from '../../services/ticketService';

const ReceptionistDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [nimInputs, setNimInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [printedTickets, setPrintedTickets] = useState([]);
  const [currentShift, setCurrentShift] = useState('Pagi'); // Default to Pagi

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getCategoriesWithPrices();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.price : 0;
  };

  const addToCart = (category) => {
    const existingItem = cart.find(item => item.category_id === category.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.category_id === category.id
          ? { ...item, quantity: item.quantity + 1 }
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

  const updateQuantity = (categoryId, change) => {
    setCart(cart.map(item => {
      if (item.category_id === categoryId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (categoryId) => {
    setCart(cart.filter(item => item.category_id !== categoryId));
    const newNimInputs = { ...nimInputs };
    delete newNimInputs[categoryId];
    setNimInputs(newNimInputs);
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handlePrintTickets = async () => {
    // Validate NIM inputs
    for (const item of cart) {
      if (item.requires_nim && !nimInputs[item.category_id]) {
        toast.error(`NIM required for ${item.category_name}`);
        return;
      }
    }

    setPrinting(true);
    try {
      const ticketItems = cart.map(item => ({
        category_id: item.category_id,
        quantity: item.quantity,
        nim: item.requires_nim ? nimInputs[item.category_id] : null
      }));

      const result = await createBatchTickets(ticketItems, user, currentShift);
      setPrintedTickets(result.tickets);
      toast.success(`${result.total_tickets} tickets created successfully!`);

      // Print
      setTimeout(() => {
        window.print();
        // Clear cart after print
        setCart([]);
        setNimInputs({});
        setPrintedTickets([]);
      }, 500);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create tickets: ' + error.message);
    } finally {
      setPrinting(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50" data-testid="receptionist-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Kolam Renang UNY - Resepsionis</h1>
            <p className="text-sm text-slate-600">Selamat datang, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Ticket Selection */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>Select Ticket Type</h2>

            {/* Shift Selector */}
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-slate-200">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Shift:</span>
              <select
                value={currentShift}
                onChange={(e) => setCurrentShift(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer"
              >
                <option value="Pagi">Pagi</option>
                <option value="Siang">Siang</option>
                <option value="Sore">Sore</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {categories.map(category => (
              <Card
                key={category.id}
                className="p-6 cursor-pointer ticket-category-card hover:border-sky-500 transition-colors"
                onClick={() => addToCart(category)}
                data-testid={`ticket-category-${category.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{category.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                  </div>
                  <Ticket className="w-8 h-8 text-sky-500" />
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <span className="text-2xl font-bold text-slate-900">Rp {category.price.toLocaleString()}</span>
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l border-slate-200 p-6 overflow-auto flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>Cart</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium px-2 py-1 bg-sky-100 text-sky-700 rounded full">
                Shift: {currentShift}
              </span>
              <ShoppingCart className="w-6 h-6 text-slate-600" />
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex-1 flex flex-col justify-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No tickets selected</p>
              <p className="text-sm">Click on a ticket type to add</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 flex-1 overflow-auto pb-4">
                {cart.map(item => (
                  <Card key={item.category_id} className="p-4" data-testid={`cart-item-${item.category_id}`}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{item.category_name}</h3>
                          <p className="text-sm text-slate-600">Rp {item.price.toLocaleString()} each</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.category_id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.category_id, -1)}
                          data-testid={`decrease-qty-${item.category_id}`}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.category_id, 1)}
                          data-testid={`increase-qty-${item.category_id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {item.requires_nim && (
                        <div>
                          <Label htmlFor={`nim-${item.category_id}`} className="text-xs">Student NIM (Required)</Label>
                          <Input
                            id={`nim-${item.category_id}`}
                            value={nimInputs[item.category_id] || ''}
                            onChange={(e) => setNimInputs({ ...nimInputs, [item.category_id]: e.target.value })}
                            placeholder="Enter NIM"
                            className="mt-1 h-9 text-sm"
                            data-testid={`nim-input-${item.category_id}`}
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal:</span>
                          <span className="font-semibold text-slate-900">Rp {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="pt-4 border-t-2 border-slate-300 mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-slate-900">Total:</span>
                  <span className="text-2xl font-bold text-slate-900">Rp {getTotalAmount().toLocaleString()}</span>
                </div>
                <Button
                  onClick={handlePrintTickets}
                  disabled={printing || cart.length === 0}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-base"
                  data-testid="print-tickets-button"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  {printing ? 'Processing...' : 'Print Tickets'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print Template */}
      {printedTickets.length > 0 && (
        <div className="hidden print:block">
          {printedTickets.map((ticket, index) => (
            <div key={ticket.id} className="printable-ticket" style={{ pageBreakAfter: 'always', padding: '10px', width: '300px' }}>
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold">KOLAM RENANG UNY</h2>
                <h3 className="text-lg font-semibold">{ticket.category_name}</h3>
              </div>

              <div className="flex justify-center my-4">
                <img src={ticket.qr_code} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="text-sm space-y-1 font-mono">
                <p><strong>ID:</strong> {ticket.id.split('-')[0].toUpperCase()}</p>
                <p><strong>Price:</strong> Rp {ticket.price.toLocaleString()}</p>
                {ticket.nim && <p><strong>NIM:</strong> {ticket.nim}</p>}
                <p><strong>Shift:</strong> {ticket.shift}</p>
                <p><strong>Date:</strong> {new Date(ticket.created_at).toLocaleString('id-ID')}</p>
                <p><strong>Staff:</strong> {ticket.created_by_name}</p>
                <div className="text-center pt-4 mt-4 border-t border-dashed border-black">
                  <p className="font-bold">TIKET HANYA BERLAKU 1 KALI</p>
                  <p>TIKET YANG SUDAH DIBELI TIDAK DAPAT DIKEMBALIKAN</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
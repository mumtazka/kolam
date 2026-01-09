import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PriceManagement = () => {
  const [categories, setCategories] = useState([]);
  const [prices, setPrices] = useState([]);
  const [priceInputs, setPriceInputs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, priceRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/prices`)
      ]);
      setCategories(catRes.data);
      setPrices(priceRes.data);
      
      // Initialize price inputs
      const inputs = {};
      catRes.data.forEach(cat => {
        const price = priceRes.data.find(p => p.category_id === cat.id);
        inputs[cat.id] = price ? price.price : 0;
      });
      setPriceInputs(inputs);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async (categoryId, price) => {
    try {
      await axios.post(`${API}/prices`, { category_id: categoryId, price: parseFloat(price) });
      toast.success('Price updated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to update price');
    }
  };

  const getPrice = (categoryId) => {
    const price = prices.find(p => p.category_id === categoryId);
    return price ? price.price : 0;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900" style={{fontFamily: 'Outfit'}}>Price Management</h1>
        <p className="text-slate-600 mt-1">Set and update ticket prices for each category</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const currentPrice = getPrice(category.id);
          
          return (
            <Card key={category.id} className="p-6" data-testid={`price-card-${category.id}`}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{category.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                  {category.requires_nim && (
                    <span className="inline-block mt-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">Requires NIM</span>
                  )}
                </div>
                <div>
                  <Label htmlFor={`price-${category.id}`}>Price (Rp)</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      id={`price-${category.id}`}
                      type="number"
                      value={priceInputs[category.id] || 0}
                      onChange={(e) => setPriceInputs(prev => ({...prev, [category.id]: e.target.value}))}
                      className="flex-1"
                      data-testid={`price-input-${category.id}`}
                    />
                    <Button
                      onClick={() => handlePriceUpdate(category.id, priceInputs[category.id])}
                      className="bg-slate-900 hover:bg-slate-800"
                      data-testid={`update-price-${category.id}`}
                    >
                      Update
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Current: Rp {currentPrice.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PriceManagement;
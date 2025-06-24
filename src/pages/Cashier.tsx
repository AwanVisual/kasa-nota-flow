import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, ShoppingCart, Trash2, Receipt, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import PreCheckoutDialog from '@/components/PreCheckoutDialog';

interface CartItem {
  product: any;
  quantity: number;
}

interface ReceiptFieldsConfig {
  showAmount: boolean;
  showDppFaktur: boolean;
  showDiscount: boolean;
  showPpn11: boolean;
}

const Cashier = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReceived, setPaymentReceived] = useState<number>(0);
  const [bankDetails, setBankDetails] = useState('');
  const [taxRate, setTaxRate] = useState<number>(11);
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [receiptConfig, setReceiptConfig] = useState<ReceiptFieldsConfig>({
    showAmount: true,
    showDppFaktur: false,
    showDiscount: false,
    showPpn11: false,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('stock_quantity', 0);
      return data || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*');
      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>) || {};
      return settingsMap;
    },
  });

  useEffect(() => {
    if (settings?.tax_rate) {
      setTaxRate(parseFloat(settings.tax_rate));
    }
  }, [settings]);

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  const change = paymentReceived - total;

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity < product.stock_quantity) {
          return prev.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          toast({ title: "Error", description: "Not enough stock", variant: "destructive" });
          return prev;
        }
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          if (newQuantity <= item.product.stock_quantity) {
            return { ...item, quantity: newQuantity };
          } else {
            toast({ title: "Error", description: "Not enough stock", variant: "destructive" });
          }
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handlePreCheckoutProceed = (config: ReceiptFieldsConfig) => {
    setReceiptConfig(config);
    // Automatically proceed to complete sale after pre-checkout
    processSaleMutation.mutate();
  };

  const processSaleMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error('Cart is empty');
      if (paymentReceived < total) throw new Error('Insufficient payment');

      // Generate sale number
      const { data: saleNumber } = await supabase.rpc('generate_sale_number');
      
      // Create sale record with bank details if applicable
      const saleData: any = {
        sale_number: saleNumber,
        customer_name: customerName || null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        payment_method: paymentMethod as any,
        payment_received: paymentReceived,
        change_amount: change,
        created_by: user?.id,
      };

      // Add bank details for non-cash payments
      if (paymentMethod !== 'cash' && bankDetails) {
        saleData.notes = `Bank Details: ${bankDetails}`;
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: Number(item.product.price),
        subtotal: Number(item.product.price) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Create stock movements for each item
      const stockMovements = cart.map(item => ({
        product_id: item.product.id,
        transaction_type: 'outbound' as any,
        quantity: item.quantity,
        reference_number: saleNumber,
        notes: `Sale: ${saleNumber}`,
        created_by: user?.id,
      }));

      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert(stockMovements);

      if (stockError) throw stockError;

      return sale;
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCart([]);
      setCustomerName('');
      setPaymentReceived(0);
      setBankDetails('');
      toast({ 
        title: "Success", 
        description: `Sale ${sale.sale_number} completed successfully!` 
      });
      
      // Generate and download receipt with updated settings
      generateReceipt(sale);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const calculateDetailedPricing = (item: CartItem) => {
    const price = Number(item.product.price);
    const quantity = item.quantity;
    
    const amount = quantity * price;
    const dpp11 = (100 / 111) * price;
    const discount8 = 0.08 * dpp11;
    const dppFaktur = dpp11 - discount8;
    const ppn11 = 0.11 * dppFaktur;
    
    return {
      amount,
      dppFaktur: dppFaktur * quantity,
      discount8: discount8 * quantity,
      ppn11: ppn11 * quantity,
    };
  };

  const generateReceipt = (sale: any) => {
    const logoUrl = settings?.company_logo ? settings.company_logo : '';
    const storeName = settings?.store_name || 'Your Store';
    const storeAddress = settings?.store_address || 'Store Address';
    const storePhone = settings?.store_phone || 'Phone Number';
    const receiptHeader = settings?.receipt_header || 'Thank you for your purchase!';
    const receiptFooter = settings?.receipt_footer || 'Have a great day!';
    const showTaxDetails = settings?.show_tax_details === 'true';

    // Calculate detailed pricing totals for receipt
    const detailedTotals = cart.reduce((totals, item) => {
      const itemCalc = calculateDetailedPricing(item);
      return {
        dppFaktur: totals.dppFaktur + itemCalc.dppFaktur,
        discount8: totals.discount8 + itemCalc.discount8,
        ppn11: totals.ppn11 + itemCalc.ppn11,
      };
    }, { dppFaktur: 0, discount8: 0, ppn11: 0 });
    
    const receiptContent = `
      <div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
          <h2>${storeName}</h2>
          <p>${storeAddress}</p>
          <p>${storePhone}</p>
        </div>
        
        <div style="margin: 20px 0; text-align: center;">
          <h3>RECEIPT</h3>
          <p>No: ${sale.sale_number}</p>
          <p>Date: ${new Date(sale.created_at).toLocaleString('id-ID')}</p>
          ${sale.customer_name ? `<p>Customer: ${sale.customer_name}</p>` : ''}
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding: 5px;">Item</th>
              <th style="text-align: center; padding: 5px;">Qty</th>
              <th style="text-align: right; padding: 5px;">Price</th>
              <th style="text-align: right; padding: 5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${cart.map(item => `
              <tr>
                <td style="padding: 5px;">${item.product.name}</td>
                <td style="text-align: center; padding: 5px;">${item.quantity}</td>
                <td style="text-align: right; padding: 5px;">${formatCurrency(Number(item.product.price))}</td>
                <td style="text-align: right; padding: 5px;">${formatCurrency(Number(item.product.price) * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${receiptConfig.showDppFaktur ? `
          <div style="display: flex; justify-content: space-between;">
            <span>DPP Faktur:</span>
            <span>${formatCurrency(detailedTotals.dppFaktur)}</span>
          </div>
          ` : ''}
          ${receiptConfig.showDiscount ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Discount 8%:</span>
            <span>${formatCurrency(detailedTotals.discount8)}</span>
          </div>
          ` : ''}
          ${showTaxDetails ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Tax (${taxRate}%):</span>
            <span>${formatCurrency(taxAmount)}</span>
          </div>
          ` : ''}
          ${receiptConfig.showPpn11 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>PPN 11%:</span>
            <span>${formatCurrency(detailedTotals.ppn11)}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;">
            <span>Total:</span>
            <span>${formatCurrency(total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Payment (${paymentMethod}):</span>
            <span>${formatCurrency(paymentReceived)}</span>
          </div>
          ${bankDetails && paymentMethod !== 'cash' ? `
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Bank Details:</span>
            <span>${bankDetails}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span>Change:</span>
            <span>${formatCurrency(change)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
          <p>${receiptHeader}</p>
          <p>${receiptFooter}</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Receipt - ${sale.sale_number}</title></head>
          <body>${receiptContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Cashier</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {products?.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => addToCart(product)}
                >
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.sku}</p>
                  <p className="font-bold text-lg">{formatCurrency(Number(product.price))}</p>
                  <Badge variant={product.stock_quantity <= product.min_stock_level ? "destructive" : "default"}>
                    Stock: {product.stock_quantity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cart & Checkout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Shopping Cart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(Number(item.product.price))} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name (Optional)</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod !== 'cash' && (
                    <div>
                      <Label htmlFor="bankDetails">Bank Details</Label>
                      <Input
                        id="bankDetails"
                        value={bankDetails}
                        onChange={(e) => setBankDetails(e.target.value)}
                        placeholder="Enter bank name, account number, etc."
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="paymentReceived">Payment Received</Label>
                    <Input
                      id="paymentReceived"
                      type="number"
                      value={paymentReceived}
                      onChange={(e) => setPaymentReceived(parseFloat(e.target.value) || 0)}
                      placeholder="Enter payment amount"
                    />
                  </div>

                  {paymentReceived > 0 && (
                    <div className="flex justify-between text-lg">
                      <span>Change:</span>
                      <span className={change < 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(Math.max(0, change))}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowPreCheckout(true)}
                      disabled={cart.length === 0}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Pre-Checkout Breakdown
                    </Button>

                    <Button
                      className="w-full"
                      onClick={() => processSaleMutation.mutate()}
                      disabled={cart.length === 0 || paymentReceived < total || processSaleMutation.isPending}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      {processSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <PreCheckoutDialog
        open={showPreCheckout}
        onOpenChange={setShowPreCheckout}
        cart={cart}
        onProceedToPayment={handlePreCheckoutProceed}
      />
    </div>
  );
};

export default Cashier;


import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Receipt } from 'lucide-react';

interface CartItem {
  product: any;
  quantity: number;
}

interface PreCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onProceedToPayment: (receiptFields: ReceiptFieldsConfig) => void;
}

interface ReceiptFieldsConfig {
  showAmount: boolean;
  showDppFaktur: boolean;
  showDiscount: boolean;
  showPpn11: boolean;
}

interface ItemCalculations {
  amount: number;
  dpp11: number;
  discount8: number;
  dppFaktur: number;
  dppLain: number;
  ppn12: number;
  ppn11: number;
}

const PreCheckoutDialog: React.FC<PreCheckoutDialogProps> = ({
  open,
  onOpenChange,
  cart,
  onProceedToPayment
}) => {
  const [receiptFields, setReceiptFields] = useState<ReceiptFieldsConfig>({
    showAmount: true,
    showDppFaktur: false,
    showDiscount: false,
    showPpn11: false,
  });

  // Calculate detailed pricing for each item
  const calculateItemDetails = (item: CartItem): ItemCalculations => {
    const price = Number(item.product.price);
    const quantity = item.quantity;
    
    // Amount = Quantity × Price
    const amount = quantity * price;
    
    // DPP 11% = (100 / 111) × Price
    const dpp11 = (100 / 111) * price;
    
    // Discount 8% = 8% × DPP 11%
    const discount8 = 0.08 * dpp11;
    
    // DPP Faktur = DPP 11% - Discount
    const dppFaktur = dpp11 - discount8;
    
    // DPP Lain = (11 / 12) × DPP Faktur
    const dppLain = (11 / 12) * dppFaktur;
    
    // PPN calculations (should result in same value)
    const ppn12 = 0.12 * dppFaktur;
    const ppn11 = 0.11 * dppFaktur;
    
    return {
      amount,
      dpp11: dpp11 * quantity,
      discount8: discount8 * quantity,
      dppFaktur: dppFaktur * quantity,
      dppLain: dppLain * quantity,
      ppn12: ppn12 * quantity,
      ppn11: ppn11 * quantity,
    };
  };

  // Calculate totals for all items
  const calculateTotals = () => {
    return cart.reduce((totals, item) => {
      const itemCalc = calculateItemDetails(item);
      return {
        amount: totals.amount + itemCalc.amount,
        dpp11: totals.dpp11 + itemCalc.dpp11,
        discount8: totals.discount8 + itemCalc.discount8,
        dppFaktur: totals.dppFaktur + itemCalc.dppFaktur,
        dppLain: totals.dppLain + itemCalc.dppLain,
        ppn12: totals.ppn12 + itemCalc.ppn12,
        ppn11: totals.ppn11 + itemCalc.ppn11,
      };
    }, {
      amount: 0,
      dpp11: 0,
      discount8: 0,
      dppFaktur: 0,
      dppLain: 0,
      ppn12: 0,
      ppn11: 0,
    });
  };

  const totals = calculateTotals();

  const handleFieldChange = (field: keyof ReceiptFieldsConfig, checked: boolean) => {
    setReceiptFields(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const handleProceedToPayment = () => {
    onProceedToPayment(receiptFields);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Pre-Checkout Pricing Breakdown
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item-wise calculations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Item Details</h3>
            {cart.map((item, index) => {
              const itemCalc = calculateItemDetails(item);
              return (
                <Card key={item.product.id} className="p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {item.product.name} (Qty: {item.quantity})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <div className="font-medium">{formatCurrency(itemCalc.amount)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DPP 11%:</span>
                      <div className="font-medium">{formatCurrency(itemCalc.dpp11)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Discount 8%:</span>
                      <div className="font-medium">{formatCurrency(itemCalc.discount8)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DPP Faktur:</span>
                      <div className="font-medium">{formatCurrency(itemCalc.dppFaktur)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DPP Lain:</span>
                      <div className="font-medium">{formatCurrency(itemCalc.dppLain)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PPN 12%:</span>
                      <div className="font-medium">{formatCurrency(itemCalc.ppn12)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PPN 11%:</span>
                      <div className="font-medium">{formatCurrency(itemCalc.ppn11)}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Total calculations */}
          <Card>
            <CardHeader>
              <CardTitle>Total Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <div className="font-bold text-lg">{formatCurrency(totals.amount)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total DPP 11%:</span>
                <div className="font-medium text-red-600">{formatCurrency(totals.dpp11)}</div>
                <small className="text-xs text-muted-foreground">(Hidden on receipt)</small>
              </div>
              <div>
                <span className="text-muted-foreground">Total Discount 8%:</span>
                <div className="font-medium">{formatCurrency(totals.discount8)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total DPP Faktur:</span>
                <div className="font-medium">{formatCurrency(totals.dppFaktur)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total DPP Lain:</span>
                <div className="font-medium text-red-600">{formatCurrency(totals.dppLain)}</div>
                <small className="text-xs text-muted-foreground">(Hidden on receipt)</small>
              </div>
              <div>
                <span className="text-muted-foreground">Total PPN 12%:</span>
                <div className="font-medium text-red-600">{formatCurrency(totals.ppn12)}</div>
                <small className="text-xs text-muted-foreground">(Hidden on receipt)</small>
              </div>
              <div>
                <span className="text-muted-foreground">Total PPN 11%:</span>
                <div className="font-medium">{formatCurrency(totals.ppn11)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt field selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Receipt Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which calculated fields should appear on the printed receipt. 
                Fields marked in red are always hidden from receipts.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showAmount"
                    checked={receiptFields.showAmount}
                    onCheckedChange={(checked) => handleFieldChange('showAmount', !!checked)}
                  />
                  <label htmlFor="showAmount" className="text-sm font-medium">
                    Show Amount on Receipt
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showDppFaktur"
                    checked={receiptFields.showDppFaktur}
                    onCheckedChange={(checked) => handleFieldChange('showDppFaktur', !!checked)}
                  />
                  <label htmlFor="showDppFaktur" className="text-sm font-medium">
                    Show DPP Faktur on Receipt
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showDiscount"
                    checked={receiptFields.showDiscount}
                    onCheckedChange={(checked) => handleFieldChange('showDiscount', !!checked)}
                  />
                  <label htmlFor="showDiscount" className="text-sm font-medium">
                    Show Discount 8% on Receipt
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPpn11"
                    checked={receiptFields.showPpn11}
                    onCheckedChange={(checked) => handleFieldChange('showPpn11', !!checked)}
                  />
                  <label htmlFor="showPpn11" className="text-sm font-medium">
                    Show PPN 11% on Receipt
                  </label>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> DPP 11%, DPP Lain, and PPN 12% are always hidden from receipts 
                  and cannot be selected.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleProceedToPayment}>
            Proceed to Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreCheckoutDialog;

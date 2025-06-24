
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface CartItem {
  product: any;
  quantity: number;
}

interface ReceiptFieldsConfig {
  showAmount: boolean;
  showDppFaktur: boolean;
  showDiscount: boolean;
  showPpn11: boolean;
  discountPercentage: number;
}

interface PreCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onProceedToPayment: (config: ReceiptFieldsConfig) => void;
}

const PreCheckoutDialog = ({ open, onOpenChange, cart, onProceedToPayment }: PreCheckoutDialogProps) => {
  const [receiptConfig, setReceiptConfig] = useState<ReceiptFieldsConfig>({
    showAmount: true,
    showDppFaktur: false,
    showDiscount: false,
    showPpn11: false,
    discountPercentage: 0,
  });

  const calculateDetailedPricing = (item: CartItem) => {
    const price = Number(item.product.price);
    const quantity = item.quantity;
    
    const amount = quantity * price;
    const dpp11 = (100 / 111) * price;
    const discount = (receiptConfig.discountPercentage / 100) * dpp11;
    const dppFaktur = dpp11 - discount;
    const dppLain = (11 / 12) * dppFaktur;
    
    // PPN 11% and PPN 12% must return the same value
    const ppn11 = 0.11 * dppFaktur;
    const ppn12 = ppn11; // Same value as PPN 11%
    
    return {
      amount,
      dpp11: dpp11 * quantity,
      discount: discount * quantity,
      dppFaktur: dppFaktur * quantity,
      dppLain: dppLain * quantity,
      ppn11: ppn11 * quantity,
      ppn12: ppn12 * quantity,
    };
  };

  const calculateTotals = () => {
    return cart.reduce((totals, item) => {
      const itemCalc = calculateDetailedPricing(item);
      return {
        amount: totals.amount + itemCalc.amount,
        dpp11: totals.dpp11 + itemCalc.dpp11,
        discount: totals.discount + itemCalc.discount,
        dppFaktur: totals.dppFaktur + itemCalc.dppFaktur,
        dppLain: totals.dppLain + itemCalc.dppLain,
        ppn11: totals.ppn11 + itemCalc.ppn11,
        ppn12: totals.ppn12 + itemCalc.ppn12,
      };
    }, {
      amount: 0,
      dpp11: 0,
      discount: 0,
      dppFaktur: 0,
      dppLain: 0,
      ppn11: 0,
      ppn12: 0,
    });
  };

  const totals = calculateTotals();

  const handleProceed = () => {
    onProceedToPayment(receiptConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-Checkout Pricing Breakdown (Special Customer)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Discount Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discount Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Label htmlFor="discountPercentage">Discount Percentage:</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={receiptConfig.discountPercentage}
                  onChange={(e) => setReceiptConfig(prev => ({
                    ...prev,
                    discountPercentage: parseFloat(e.target.value) || 0
                  }))}
                  className="w-24"
                />
                <span>%</span>
              </div>
            </CardContent>
          </Card>

          {/* Item-by-Item Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Item Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.map((item, index) => {
                  const calc = calculateDetailedPricing(item);
                  return (
                    <div key={item.product.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">
                        {item.product.name} (Qty: {item.quantity})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <div className="font-medium">{formatCurrency(calc.amount)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">DPP 11%:</span>
                          <div className="font-medium text-gray-500">{formatCurrency(calc.dpp11)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Discount ({receiptConfig.discountPercentage}%):</span>
                          <div className="font-medium">{formatCurrency(calc.discount)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">DPP Faktur:</span>
                          <div className="font-medium">{formatCurrency(calc.dppFaktur)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">DPP Lain:</span>
                          <div className="font-medium text-gray-500">{formatCurrency(calc.dppLain)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PPN 11%:</span>
                          <div className="font-medium">{formatCurrency(calc.ppn11)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PPN 12%:</span>
                          <div className="font-medium text-gray-500">{formatCurrency(calc.ppn12)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Summary Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="font-bold text-lg">{formatCurrency(totals.amount)}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">DPP 11% (Hidden)</div>
                  <div className="font-medium text-gray-500">{formatCurrency(totals.dpp11)}</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Discount</div>
                  <div className="font-bold text-red-600">{formatCurrency(totals.discount)}</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">DPP Faktur</div>
                  <div className="font-bold text-green-600">{formatCurrency(totals.dppFaktur)}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">DPP Lain (Hidden)</div>
                  <div className="font-medium text-gray-500">{formatCurrency(totals.dppLain)}</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">PPN 11%</div>
                  <div className="font-bold text-blue-600">{formatCurrency(totals.ppn11)}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">PPN 12% (Hidden)</div>
                  <div className="font-medium text-gray-500">{formatCurrency(totals.ppn12)}</div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Final Total (DPP Faktur + PPN 11%)</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(totals.dppFaktur + totals.ppn11)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipt Display Options</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select which fields will appear on the printed receipt. 
                <br />
                <em>Note: DPP 11%, DPP Lain, and PPN 12% are always hidden from receipt.</em>
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showAmount"
                    checked={receiptConfig.showAmount}
                    onCheckedChange={(checked) => 
                      setReceiptConfig(prev => ({ ...prev, showAmount: checked as boolean }))
                    }
                  />
                  <Label htmlFor="showAmount">Show Amount</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showDppFaktur"
                    checked={receiptConfig.showDppFaktur}
                    onCheckedChange={(checked) => 
                      setReceiptConfig(prev => ({ ...prev, showDppFaktur: checked as boolean }))
                    }
                  />
                  <Label htmlFor="showDppFaktur">Show DPP Faktur</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showDiscount"
                    checked={receiptConfig.showDiscount}
                    onCheckedChange={(checked) => 
                      setReceiptConfig(prev => ({ ...prev, showDiscount: checked as boolean }))
                    }
                  />
                  <Label htmlFor="showDiscount">Show Discount</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPpn11"
                    checked={receiptConfig.showPpn11}
                    onCheckedChange={(checked) => 
                      setReceiptConfig(prev => ({ ...prev, showPpn11: checked as boolean }))
                    }
                  />
                  <Label htmlFor="showPpn11">Show PPN 11%</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleProceed}>
            Apply Configuration & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreCheckoutDialog;

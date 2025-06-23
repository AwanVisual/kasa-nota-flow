
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Save, Building2, Receipt, Users, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const [companySettings, setCompanySettings] = useState({
    name: 'Your Company Name',
    address: 'Your Company Address',
    phone: 'Your Phone Number',
    taxRate: '11',
  });

  const [receiptSettings, setReceiptSettings] = useState({
    header: 'Thank you for your purchase!',
    footer: 'Have a great day!',
    showLogo: true,
  });

  const handleSaveCompany = () => {
    toast({
      title: "Settings saved",
      description: "Company settings have been updated successfully.",
    });
  };

  const handleSaveReceipt = () => {
    toast({
      title: "Settings saved", 
      description: "Receipt settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your system configuration</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Update your company details for receipts and invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <Input
                    id="company-phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea
                  id="company-address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">VAT/PPN Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={companySettings.taxRate}
                  onChange={(e) => setCompanySettings({...companySettings, taxRate: e.target.value})}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Company Logo</Label>
                <div className="flex items-center gap-4">
                  <Input id="logo-upload" type="file" accept="image/*" className="flex-1" />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Recommended size: 200x200px. Supported formats: JPG, PNG, SVG
                </p>
              </div>
              <Button onClick={handleSaveCompany} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Company Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Receipt Customization
              </CardTitle>
              <CardDescription>
                Customize the appearance of your transaction receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt-header">Receipt Header</Label>
                <Input
                  id="receipt-header"
                  value={receiptSettings.header}
                  onChange={(e) => setReceiptSettings({...receiptSettings, header: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt-footer">Receipt Footer</Label>
                <Input
                  id="receipt-footer"
                  value={receiptSettings.footer}
                  onChange={(e) => setReceiptSettings({...receiptSettings, footer: e.target.value})}
                />
              </div>
              <Button onClick={handleSaveReceipt} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Receipt Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                User management will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Notification settings will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

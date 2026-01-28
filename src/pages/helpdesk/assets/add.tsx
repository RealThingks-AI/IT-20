import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Upload, X, ArrowLeft } from "lucide-react";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

const currencies = [
  { code: "INR", name: "India Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
];

export default function AddAsset() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    categories, 
    sites, 
    locations, 
    departments, 
    makes, 
    isLoading: configLoading 
  } = useAssetSetupConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store IDs instead of names for foreign key fields
  const [formData, setFormData] = useState({
    asset_tag: "",
    serial_number: "",
    make_id: "",
    model: "",
    purchase_date: null as Date | null,
    purchased_from: "",
    cost: "",
    currency: "INR",
    description: "",
    asset_configuration: "",
    headphone: "",
    mouse: "",
    keyboard: "",
    classification_confidential: false,
    classification_internal: false,
    classification_public: false,
    site_id: "",
    location_id: "",
    category_id: "",
    department_id: "",
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleAutoFill = async () => {
    setIsAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-next-asset-id");
      if (error) throw error;
      if (data?.asset_id) {
        setFormData(prev => ({ ...prev, asset_tag: data.asset_id }));
        toast.success("Asset Tag ID generated");
      }
    } catch (error) {
      toast.error("Failed to generate Asset Tag ID");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast.error("Please upload a JPG, PNG, or GIF image");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createAsset = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      const tenantId = profile?.tenant_id || 1;

      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("asset-photos")
          .upload(fileName, photoFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("asset-photos")
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      // Build classification array
      const classifications: string[] = [];
      if (formData.classification_confidential) classifications.push("confidential");
      if (formData.classification_internal) classifications.push("internal");
      if (formData.classification_public) classifications.push("public");

      // Generate asset_id (required field)
      const assetId = formData.asset_tag || `AST-${Date.now()}`;

      // Get category name for the name field fallback
      const selectedCategory = categories.find(c => c.id === formData.category_id);

      // @ts-ignore - Complex Supabase type inference issue
      const { error } = await supabase.from("itam_assets").insert({
        asset_id: assetId,
        asset_tag: assetId,
        name: formData.description || formData.model || "Unnamed Asset",
        status: "available",
        // Use UUID foreign keys
        category_id: formData.category_id || null,
        location_id: formData.location_id || null,
        department_id: formData.department_id || null,
        make_id: formData.make_id || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        purchase_price: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.description || null,
        tenant_id: tenantId,
        is_active: true,
        purchase_date: formData.purchase_date ? format(formData.purchase_date, "yyyy-MM-dd") : null,
        custom_fields: {
          asset_configuration: formData.asset_configuration,
          headphone: formData.headphone,
          mouse: formData.mouse,
          keyboard: formData.keyboard,
          classification: classifications,
          currency: formData.currency,
          vendor: formData.purchased_from,
          photo_url: photoUrl,
          site_id: formData.site_id || null,
        },
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset created successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets-overview"] });
      navigate("/assets/allassets");
    },
    onError: (error: Error) => {
      toast.error("Failed to create asset: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_tag.trim()) {
      toast.error("Please enter an Asset Tag ID or use AutoFill");
      return;
    }
    if (!formData.serial_number.trim()) {
      toast.error("Please enter a Serial Number");
      return;
    }
    createAsset.mutate();
  };

  const handleCancel = () => {
    navigate("/assets/allassets");
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">Add an Asset</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Details */}
        <Card>
          <CardHeader className="bg-muted/50 py-3">
            <CardTitle className="text-base font-medium">Asset Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Asset Tag ID with AutoFill */}
              <div className="space-y-2">
                <Label htmlFor="asset_tag">
                  Asset Tag ID <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="asset_tag"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    placeholder="Enter asset tag"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAutoFill}
                    disabled={isAutoFilling}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isAutoFilling ? <Loader2 className="h-4 w-4 animate-spin" /> : "AutoFill"}
                  </Button>
                </div>
              </div>

              {/* Serial No */}
              <div className="space-y-2">
                <Label htmlFor="serial_number">
                  Serial No <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Enter serial number"
                />
              </div>

              {/* Brand - Now stores ID */}
              <div className="space-y-2">
                <Label htmlFor="brand">
                  Brand <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.make_id}
                  onValueChange={(value) => setFormData({ ...formData, make_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {makes.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        No brands found.{" "}
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => navigate("/assets/setup?section=makes")}
                        >
                          Add one
                        </Button>
                      </div>
                    ) : (
                      makes.map((make) => (
                        <SelectItem key={make.id} value={make.id}>
                          {make.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model">
                  Model <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Enter model"
                />
              </div>

              {/* Purchase Date */}
              <div className="space-y-2">
                <Label>
                  Purchase Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.purchase_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.purchase_date ? format(formData.purchase_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.purchase_date || undefined}
                      onSelect={(date) => setFormData({ ...formData, purchase_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Purchased from */}
              <div className="space-y-2">
                <Label htmlFor="purchased_from">
                  Purchased from <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="purchased_from"
                  value={formData.purchased_from}
                  onChange={(e) => setFormData({ ...formData, purchased_from: e.target.value })}
                  placeholder="Enter vendor name"
                />
              </div>

              {/* Cost with Currency */}
              <div className="space-y-2">
                <Label htmlFor="cost">
                  Cost <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Description - Full width */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter asset description"
                  rows={3}
                />
              </div>

              {/* Asset Configuration */}
              <div className="space-y-2">
                <Label htmlFor="asset_configuration">
                  Asset Configuration <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="asset_configuration"
                  value={formData.asset_configuration}
                  onChange={(e) => setFormData({ ...formData, asset_configuration: e.target.value })}
                  placeholder="Enter configuration"
                />
              </div>

              {/* Headphone */}
              <div className="space-y-2">
                <Label htmlFor="headphone">
                  Headphone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="headphone"
                  value={formData.headphone}
                  onChange={(e) => setFormData({ ...formData, headphone: e.target.value })}
                  placeholder="Enter headphone details"
                />
              </div>

              {/* Mouse */}
              <div className="space-y-2">
                <Label htmlFor="mouse">
                  Mouse <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mouse"
                  value={formData.mouse}
                  onChange={(e) => setFormData({ ...formData, mouse: e.target.value })}
                  placeholder="Enter mouse details"
                />
              </div>

              {/* Keyboard */}
              <div className="space-y-2">
                <Label htmlFor="keyboard">
                  Keyboard <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="keyboard"
                  value={formData.keyboard}
                  onChange={(e) => setFormData({ ...formData, keyboard: e.target.value })}
                  placeholder="Enter keyboard details"
                />
              </div>

              {/* Asset Classification */}
              <div className="space-y-2 md:col-span-2">
                <Label>Asset Classification</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confidential"
                      checked={formData.classification_confidential}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, classification_confidential: !!checked })
                      }
                    />
                    <Label htmlFor="confidential" className="font-normal cursor-pointer">
                      Confidential
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="internal"
                      checked={formData.classification_internal}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, classification_internal: !!checked })
                      }
                    />
                    <Label htmlFor="internal" className="font-normal cursor-pointer">
                      Internal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="public"
                      checked={formData.classification_public}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, classification_public: !!checked })
                      }
                    />
                    <Label htmlFor="public" className="font-normal cursor-pointer">
                      Public
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site, Location, Category and Department */}
        <Card>
          <CardHeader className="bg-muted/50 py-3">
            <CardTitle className="text-base font-medium">Site, Location, Category and Department</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Site - Now stores ID */}
              <div className="space-y-2">
                <Label>
                  Site <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.site_id}
                    onValueChange={(value) => setFormData({ ...formData, site_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No sites found.{" "}
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate("/assets/setup?section=sites")}
                          >
                            Add one
                          </Button>
                        </div>
                      ) : (
                        sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/assets/setup?section=sites")}
                    title="Add new site"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Location - Now stores ID */}
              <div className="space-y-2">
                <Label>
                  Location <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.location_id}
                    onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No locations found.{" "}
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate("/assets/setup?section=locations")}
                          >
                            Add one
                          </Button>
                        </div>
                      ) : (
                        locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/assets/setup?section=locations")}
                    title="Add new location"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Category - Now stores ID */}
              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No categories found.{" "}
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate("/assets/setup?section=categories")}
                          >
                            Add one
                          </Button>
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/assets/setup?section=categories")}
                    title="Add new category"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Department - Now stores ID */}
              <div className="space-y-2">
                <Label>Department</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No departments found.{" "}
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate("/assets/setup?section=departments")}
                          >
                            Add one
                          </Button>
                        </div>
                      ) : (
                        departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/assets/setup?section=departments")}
                    title="Add new department"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Photo */}
        <Card>
          <CardHeader className="bg-muted/50 py-3">
            <CardTitle className="text-base font-medium">Asset Photo</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a photo of the asset (JPG, GIF, or PNG format, max 5MB)
              </p>
              
              {photoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Asset preview"
                    className="max-w-xs rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createAsset.isPending}
            className="min-w-[100px] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {createAsset.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

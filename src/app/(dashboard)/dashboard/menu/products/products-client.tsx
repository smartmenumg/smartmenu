"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { Product, Category, ProductCustomization } from "@/types/database";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  createCombo,
  getProductCustomizations,
  createProductCustomization,
  deleteProductCustomization,
  getProductDayPricing,
  saveProductDayPricing,
} from "@/lib/menu/product-actions";
import { uploadProductImage } from "@/lib/storage/image-upload";
import { paiseToRupees } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Edit,
  Loader2,
  Plus,
  Trash2,
  ImagePlus,
  X,
  PackageSearch,
  Sliders,
  Layers,
  Sparkles,
  CalendarDays,
  Check,
} from "lucide-react";

interface ProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
}

export function ProductsClient({ initialProducts, categories }: ProductsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Regular Product Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form price & GST state
  const [priceInput, setPriceInput] = useState<string>("" );
  const [origPriceInput, setOrigPriceInput] = useState<string>("");
  const [gstRate, setGstRate] = useState<string>("5");
  
  // Controlled form fields
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isAvailableChecked, setIsAvailableChecked] = useState(true);

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Combo Dialog state
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [comboSelectedItems, setComboSelectedItems] = useState<{ item_product_id: string; quantity: number }[]>([]);
  const [comboImage, setComboImage] = useState<string | null>(null);
  const [comboCategoryId, setComboCategoryId] = useState<string>("");
  const [comboPrice, setComboPrice] = useState<string>("");
  const [comboOrigPrice, setComboOrigPrice] = useState<string>("");
  const [comboGstRate, setComboGstRate] = useState<string>("5");
  const comboFileInputRef = useRef<HTMLInputElement>(null);

  // Customizations Dialog state
  const [customizationProduct, setCustomizationProduct] = useState<Product | null>(null);
  const [customizationsList, setCustomizationsList] = useState<ProductCustomization[]>([]);
  const [loadingCustomizations, setLoadingCustomizations] = useState(false);
  const [newCustomizationName, setNewCustomizationName] = useState("");
  const [newCustomizationPrice, setNewCustomizationPrice] = useState("");

  // Day Pricing Dialog state
  const [dayPricingProduct, setDayPricingProduct] = useState<Product | null>(null);
  const [dayPricingEnabled, setDayPricingEnabled] = useState(false);
  const [dayPricingRows, setDayPricingRows] = useState<{ [day: number]: { price: string; origPrice: string; active: boolean } }>({});
  const [loadingDayPricing, setLoadingDayPricing] = useState(false);
  const [dayPricingSavedMessage, setDayPricingSavedMessage] = useState(false);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ─── Day Pricing Dialog Handlers ────────────────────────────────────────────

  const handleOpenDayPricing = async (product: Product) => {
    setDayPricingProduct(product);
    setDayPricingEnabled(product.has_day_pricing ?? false);
    setLoadingDayPricing(true);
    setDayPricingSavedMessage(false);
    setError(null);

    const defaultPriceRupees = paiseToRupees(product.price).toString();
    const defaultOrigRupees = product.original_price ? paiseToRupees(product.original_price).toString() : "";

    const initialMap: { [day: number]: { price: string; origPrice: string; active: boolean } } = {};
    for (let d = 0; d <= 6; d++) {
      initialMap[d] = { price: defaultPriceRupees, origPrice: defaultOrigRupees, active: true };
    }

    try {
      const existing = await getProductDayPricing(product.id);
      for (const row of existing) {
        initialMap[row.day_of_week] = {
          price: paiseToRupees(row.price).toString(),
          origPrice: row.original_price ? paiseToRupees(row.original_price).toString() : "",
          active: row.is_active,
        };
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDayPricingRows(initialMap);
      setLoadingDayPricing(false);
    }
  };

  const handleDayPriceChange = (day: number, field: "price" | "origPrice", value: string) => {
    setDayPricingRows((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };



  const handleCopyWeekdayPrices = () => {
    const mon = dayPricingRows[1];
    if (!mon) return;
    setDayPricingRows((prev) => ({
      ...prev,
      2: { ...prev[2], price: mon.price, origPrice: mon.origPrice },
      3: { ...prev[3], price: mon.price, origPrice: mon.origPrice },
      4: { ...prev[4], price: mon.price, origPrice: mon.origPrice },
      5: { ...prev[5], price: mon.price, origPrice: mon.origPrice },
    }));
  };

  const handleCopyWeekendPrices = () => {
    const sat = dayPricingRows[6];
    if (!sat) return;
    setDayPricingRows((prev) => ({
      ...prev,
      0: { ...prev[0], price: sat.price, origPrice: sat.origPrice },
    }));
  };

  const handleSaveDayPricing = () => {
    if (!dayPricingProduct) return;
    startTransition(async () => {
      setError(null);
      const dayPrices = Object.entries(dayPricingRows).map(([dayStr, data]) => {
        const pNum = parseFloat(data.price);
        const opNum = data.origPrice ? parseFloat(data.origPrice) : null;
        return {
          day_of_week: parseInt(dayStr),
          price: isNaN(pNum) ? dayPricingProduct.price : Math.round(pNum * 100),
          original_price: opNum && !isNaN(opNum) ? Math.round(opNum * 100) : null,
          is_active: data.active,
        };
      });

      const res = await saveProductDayPricing({
        productId: dayPricingProduct.id,
        hasDayPricing: dayPricingEnabled,
        dayPrices,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setDayPricingSavedMessage(true);
        setTimeout(() => {
          setDayPricingProduct(null);
        }, 500);
      }
    });
  };

  // ─── Regular Product Dialog Handlers ────────────────────────────────────────

  const handleOpenNew = () => {
    if (categories.length === 0) {
      setError("Please create at least one category first.");
      return;
    }
    setEditingProduct(null);
    setPreviewImage(null);
    setPriceInput("");
    setOrigPriceInput("");
    setGstRate("5");
    setSelectedCategoryId(categories[0]?.id ?? "");
    setIsAvailableChecked(true);
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setPreviewImage(product.image_url ?? null);
    setPriceInput(paiseToRupees(product.price).toString());
    setOrigPriceInput(product.original_price ? paiseToRupees(product.original_price).toString() : "");
    setGstRate(product.gst_rate_percent !== undefined ? product.gst_rate_percent.toString() : "5");
    setSelectedCategoryId(product.category_id ?? categories[0]?.id ?? "");
    setIsAvailableChecked(product.available ?? true);
    setError(null);
    setIsOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCombo = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);
      const url = await uploadProductImage(file);
      if (isCombo) {
        setComboImage(url);
      } else {
        setPreviewImage(url);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (comboFileInputRef.current) comboFileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    formData.set("category_id", selectedCategoryId);
    formData.set("available", isAvailableChecked.toString());
    formData.set("price", priceInput);
    formData.set("gst_rate_percent", gstRate);
    if (origPriceInput) formData.set("original_price", origPriceInput);
    if (previewImage) formData.set("image_url", previewImage);
    
    startTransition(async () => {
      setError(null);
      let res;
      
      if (editingProduct) {
        res = await updateProduct(editingProduct.id, formData);
      } else {
        res = await createProduct(formData);
      }

      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
      }
    });
  };

  // ─── Combo Dialog Handlers ──────────────────────────────────────────────────

  const handleOpenComboDialog = () => {
    if (categories.length === 0) {
      setError("Please create at least one category first.");
      return;
    }
    setComboSelectedItems([]);
    setComboImage(null);
    setComboCategoryId(categories[0]?.id ?? "");
    setComboPrice("");
    setComboOrigPrice("");
    setComboGstRate("5");
    setError(null);
    setIsComboOpen(true);
  };

  const handleToggleComboItem = (productId: string) => {
    setComboSelectedItems((prev) => {
      const existing = prev.find((i) => i.item_product_id === productId);
      if (existing) {
        return prev.filter((i) => i.item_product_id !== productId);
      } else {
        return [...prev, { item_product_id: productId, quantity: 1 }];
      }
    });
  };

  const handleComboQuantityChange = (productId: string, quantity: number) => {
    setComboSelectedItems((prev) =>
      prev.map((i) =>
        i.item_product_id === productId ? { ...i, quantity: Math.max(1, quantity) } : i
      )
    );
  };

  const handleComboSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (comboSelectedItems.length === 0) {
      setError("Please select at least one item for this combo.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("category_id", comboCategoryId);
    formData.set("available", "true");
    formData.set("is_combo", "true");
    formData.set("price", comboPrice);
    formData.set("gst_rate_percent", comboGstRate);
    if (comboOrigPrice) formData.set("original_price", comboOrigPrice);
    if (comboImage) formData.set("image_url", comboImage);

    startTransition(async () => {
      setError(null);
      const res = await createCombo(formData, comboSelectedItems);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsComboOpen(false);
      }
    });
  };

  // ─── Customizations Dialog Handlers ─────────────────────────────────────────

  const handleOpenCustomizations = async (product: Product) => {
    setCustomizationProduct(product);
    setLoadingCustomizations(true);
    setNewCustomizationName("");
    setNewCustomizationPrice("");
    try {
      const list = await getProductCustomizations(product.id);
      setCustomizationsList(list);
    } catch {
      setCustomizationsList([]);
    } finally {
      setLoadingCustomizations(false);
    }
  };

  const handleAddCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customizationProduct || !newCustomizationName.trim()) return;

    const extraPrice = parseFloat(newCustomizationPrice) || 0;
    startTransition(async () => {
      const res = await createProductCustomization(
        customizationProduct.id,
        newCustomizationName.trim(),
        extraPrice
      );
      if (res.error) {
        setError(res.error);
      } else {
        setNewCustomizationName("");
        setNewCustomizationPrice("");
        const list = await getProductCustomizations(customizationProduct.id);
        setCustomizationsList(list);
      }
    });
  };

  const handleDeleteCustomization = async (customizationId: string) => {
    if (!customizationProduct) return;
    startTransition(async () => {
      const res = await deleteProductCustomization(customizationId, customizationProduct.id);
      if (!res.error) {
        const list = await getProductCustomizations(customizationProduct.id);
        setCustomizationsList(list);
      }
    });
  };

  // ─── Availability & Delete ──────────────────────────────────────────────────

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await deleteProduct(id);
      if (res?.error) {
        setError(res.error);
      } else {
        setDeleteId(null);
      }
    });
  };

  const handleToggleAvailability = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleProductAvailability(id, !currentStatus);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  // Compute discount percentage helper
  const calcDiscountPercent = (selling: string, original: string) => {
    const s = parseFloat(selling);
    const o = parseFloat(original);
    if (!isNaN(s) && !isNaN(o) && o > s && o > 0) {
      return Math.round(((o - s) / o) * 100);
    }
    return null;
  };

  const discountPreview = calcDiscountPercent(priceInput, origPriceInput);
  const comboDiscountPreview = calcDiscountPercent(comboPrice, comboOrigPrice);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          onClick={handleOpenComboDialog}
          variant="outline"
          className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-medium"
        >
          <Layers className="w-4 h-4 mr-2" />
          Create Combo
        </Button>
        <Button onClick={handleOpenNew} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800/80">
            <TableRow className="border-slate-700/60 hover:bg-transparent">
              <TableHead className="w-16"></TableHead>
              <TableHead className="text-slate-300 font-medium">Name</TableHead>
              <TableHead className="text-slate-300 font-medium">Category</TableHead>
              <TableHead className="text-slate-300 font-medium">Price / Discount</TableHead>
              <TableHead className="text-slate-300 font-medium text-center">GST</TableHead>
              <TableHead className="text-slate-300 font-medium text-center">Customizations</TableHead>
              <TableHead className="text-slate-300 font-medium text-center">Day Pricing</TableHead>
              <TableHead className="text-slate-300 font-medium text-center">Available</TableHead>
              <TableHead className="text-slate-300 font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialProducts.length === 0 ? (
              <TableRow className="border-slate-700/60 hover:bg-slate-800/50">
                <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                  <PackageSearch className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  No products found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              initialProducts.map((product: Product) => {
                const discount =
                  product.original_price && product.original_price > product.price
                    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                    : null;

                const gst = product.gst_rate_percent !== undefined ? product.gst_rate_percent : 5;

                return (
                  <TableRow key={product.id} className="border-slate-700/60 hover:bg-slate-800/50 group">
                    <TableCell>
                      {product.image_url ? (
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <ImagePlus className="w-4 h-4 text-slate-600" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-200">{product.name}</p>
                        {product.is_combo && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            COMBO
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{product.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {categories.find((c) => c.id === product.category_id)?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-amber-400">₹{paiseToRupees(product.price)}</span>
                        {product.original_price && product.original_price > product.price && (
                          <>
                            <span className="text-xs text-slate-500 line-through">
                              ₹{paiseToRupees(product.original_price)}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                              {discount}% OFF
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        gst > 0
                          ? "bg-slate-700 text-slate-300 border border-slate-600"
                          : "bg-slate-800/80 text-slate-500"
                      }`}>
                        {gst > 0 ? `${gst}% GST` : "0% (Exempt)"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenCustomizations(product)}
                        className={`text-xs h-7 px-2.5 rounded-lg border ${
                          product.has_customizations
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                            : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1" />
                        {product.has_customizations ? "Options" : "+ Options"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDayPricing(product)}
                        className={`text-xs h-7 px-2.5 rounded-lg border ${
                          product.has_day_pricing
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-semibold"
                            : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <CalendarDays className="w-3.5 h-3.5 mr-1" />
                        {product.has_day_pricing ? "Day Rates (On)" : "+ Day Rates"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleAvailability(product.id, product.available)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          product.available ? "bg-amber-500" : "bg-slate-700"
                        }`}
                      >
                        <span className="sr-only">Toggle availability</span>
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            product.available ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenEdit(product)}
                          className="text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteId(product.id)}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── Regular Product Dialog ────────────────────────────────────────── */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add details, pricing, GST, and image for this menu item.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            {/* Image Upload section */}
            <div className="space-y-3">
              <Label className="text-slate-200">Product Image (Optional)</Label>
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {previewImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <ImagePlus className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => handleImageUpload(e, false)}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {uploadingImage ? "Optimizing & Uploading..." : previewImage ? "Change Image" : "Upload Image"}
                  </Button>
                  <p className="text-xs text-slate-500 leading-tight">
                    Images are automatically compressed to WebP for instant customer page loading. Max 10MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="name" className="text-slate-200">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingProduct?.name}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                  placeholder="e.g. Large Caramel Popcorn"
                />
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="category_id" className="text-slate-200">Category</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(value) => value && setSelectedCategoryId(value)}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white focus:border-amber-500 focus:ring-amber-500/20">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing, Discount, and GST */}
            <div className="grid grid-cols-3 gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
              <div className="space-y-2 col-span-3 sm:col-span-1">
                <Label htmlFor="price" className="text-slate-200 text-xs uppercase tracking-wide">Selling Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                  placeholder="e.g. 90"
                />
              </div>

              <div className="space-y-2 col-span-3 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="original_price" className="text-slate-200 text-xs uppercase tracking-wide">Original Price (₹)</Label>
                  {discountPreview !== null && (
                    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                      {discountPreview}% OFF
                    </span>
                  )}
                </div>
                <Input
                  id="original_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={origPriceInput}
                  onChange={(e) => setOrigPriceInput(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                  placeholder="e.g. 100"
                />
              </div>

              <div className="space-y-2 col-span-3 sm:col-span-1">
                <Label htmlFor="gst-select" className="text-slate-200 text-xs uppercase tracking-wide">GST Rate</Label>
                <Select value={gstRate} onValueChange={(val) => val && setGstRate(val)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white focus:border-amber-500 text-sm">
                    <SelectValue placeholder="GST Rate" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="5">5% (Standard Food)</SelectItem>
                    <SelectItem value="18">18% (Beverages / Goods)</SelectItem>
                    <SelectItem value="12">12% (Packaged Food)</SelectItem>
                    <SelectItem value="0">0% (Exempt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-200">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingProduct?.description || ""}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 resize-none h-20"
                placeholder="Brief description of the item..."
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="available"
                checked={isAvailableChecked}
                onChange={(e) => setIsAvailableChecked(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/50 focus:ring-offset-0 focus:ring-2 accent-amber-500"
              />
              <Label htmlFor="available" className="text-slate-300 font-normal">
                Available for ordering immediately
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending || uploadingImage}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProduct ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Create Combo Dialog ───────────────────────────────────────────── */}
      <Dialog open={isComboOpen} onOpenChange={setIsComboOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Create Combo Package
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Bundle multiple existing products into a combo with custom pricing, GST, and photo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleComboSubmit} className="space-y-5 pt-3">
            {/* Image Upload section */}
            <div className="space-y-2">
              <Label className="text-slate-200">Combo Image (Optional)</Label>
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {comboImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={comboImage} alt="Combo Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setComboImage(null)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <ImagePlus className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={comboFileInputRef}
                    onChange={(e) => handleImageUpload(e, true)}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full"
                    disabled={uploadingImage}
                    onClick={() => comboFileInputRef.current?.click()}
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {uploadingImage ? "Uploading..." : comboImage ? "Change Image" : "Upload Combo Image"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="combo-name" className="text-slate-200">Combo Name</Label>
                <Input
                  id="combo-name"
                  name="name"
                  required
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                  placeholder="e.g. Popcorn + 2 Cokes Deal"
                />
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="combo-category" className="text-slate-200">Category</Label>
                <Select
                  value={comboCategoryId}
                  onValueChange={(value) => value && setComboCategoryId(value)}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white focus:border-amber-500">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Select Products in the Combo */}
            <div className="space-y-2">
              <Label className="text-slate-200">Select Items Included in this Combo</Label>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/60 p-3 space-y-2">
                {initialProducts.filter((p) => !p.is_combo).map((prod) => {
                  const isSelected = comboSelectedItems.some((i) => i.item_product_id === prod.id);
                  const selectedObj = comboSelectedItems.find((i) => i.item_product_id === prod.id);

                  return (
                    <div
                      key={prod.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/40 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleComboItem(prod.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500 accent-amber-500"
                        />
                        <span className="text-sm font-medium">{prod.name}</span>
                        <span className="text-xs text-amber-400">₹{paiseToRupees(prod.price)}</span>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Qty:</span>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={selectedObj?.quantity || 1}
                            onChange={(e) => handleComboQuantityChange(prod.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-xs bg-slate-800 border-slate-700 text-white text-center"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing, Discount & GST for Combo */}
            <div className="grid grid-cols-3 gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
              <div className="space-y-2 col-span-3 sm:col-span-1">
                <Label htmlFor="combo-price" className="text-slate-200 text-xs uppercase tracking-wide">Special Price (₹)</Label>
                <Input
                  id="combo-price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={comboPrice}
                  onChange={(e) => setComboPrice(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                  placeholder="e.g. 249"
                />
              </div>

              <div className="space-y-2 col-span-3 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="combo-orig-price" className="text-slate-200 text-xs uppercase tracking-wide">Original Price (₹)</Label>
                  {comboDiscountPreview !== null && (
                    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                      {comboDiscountPreview}% OFF
                    </span>
                  )}
                </div>
                <Input
                  id="combo-orig-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={comboOrigPrice}
                  onChange={(e) => setComboOrigPrice(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                  placeholder="e.g. 320"
                />
              </div>

              <div className="space-y-2 col-span-3 sm:col-span-1">
                <Label className="text-slate-200 text-xs uppercase tracking-wide">GST Rate</Label>
                <Select value={comboGstRate} onValueChange={(val) => val && setComboGstRate(val)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white focus:border-amber-500 text-sm">
                    <SelectValue placeholder="GST Rate" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="5">5% (Food GST)</SelectItem>
                    <SelectItem value="18">18% (Standard)</SelectItem>
                    <SelectItem value="12">12% (Packaged)</SelectItem>
                    <SelectItem value="0">0% (Exempt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="combo-description" className="text-slate-200">Description (Optional)</Label>
              <Textarea
                id="combo-description"
                name="description"
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 resize-none h-16"
                placeholder="What's included in this deal..."
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsComboOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending || uploadingImage}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Combo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Customizations Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!customizationProduct} onOpenChange={(open) => !open && setCustomizationProduct(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              Manage Options & Add-ons
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure customizable choices for <span className="font-semibold text-white">{customizationProduct?.name}</span> (e.g. Extra Cheese, Flavors, Toppings).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Add New Customization Form */}
            <form onSubmit={handleAddCustomization} className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Add New Choice / Add-on</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    required
                    placeholder="Option name (e.g. Extra Cheese)"
                    value={newCustomizationName}
                    onChange={(e) => setNewCustomizationName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="+₹ Extra (0 for free)"
                    value={newCustomizationPrice}
                    onChange={(e) => setNewCustomizationPrice(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-sm"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !newCustomizationName.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Add-on
              </Button>
            </form>

            {/* List of Customizations */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs uppercase tracking-wide">Active Customizations</Label>
              {loadingCustomizations ? (
                <div className="py-8 flex justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              ) : customizationsList.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                  No customizations added yet. Add one above to make this item customizable.
                </div>
              ) : (
                <div className="space-y-2">
                  {customizationsList.map((cust) => (
                    <div
                      key={cust.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700/60"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-sm font-medium text-white">{cust.name}</span>
                        <span className="text-xs text-amber-400 font-semibold">
                          {cust.price_adjustment > 0 ? `+₹${paiseToRupees(cust.price_adjustment)}` : "Free"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDeleteCustomization(cust.id)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-7 w-7"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              onClick={() => setCustomizationProduct(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Day-Wise Pricing Dialog ────────────────────────────────────────── */}
      <Dialog open={!!dayPricingProduct} onOpenChange={(open) => !open && setDayPricingProduct(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              Day-Wise Pricing — {dayPricingProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Set different prices and discounts for specific days of the week (Mon–Sun).
            </DialogDescription>
          </DialogHeader>

          {loadingDayPricing ? (
            <div className="py-12 flex justify-center text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {/* Day Pricing Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                <div>
                  <p className="font-semibold text-sm text-white">Enable Day-Wise Pricing</p>
                  <p className="text-xs text-slate-400">
                    When active, customers will see that day&apos;s special price automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDayPricingEnabled(!dayPricingEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    dayPricingEnabled ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      dayPricingEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {dayPricingEnabled && (
                <>
                  {/* Quick copy buttons */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-400">
                    <span>Quick presets:</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWeekdayPrices}
                        className="text-xs h-7 border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Copy Mon → Tue–Fri
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWeekendPrices}
                        className="text-xs h-7 border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Copy Sat → Sun
                      </Button>
                    </div>
                  </div>

                  {/* 7-Day Table */}
                  <div className="space-y-2">
                    {[
                      { day: 1, label: "Monday", isWeekend: false },
                      { day: 2, label: "Tuesday", isWeekend: false },
                      { day: 3, label: "Wednesday", isWeekend: false },
                      { day: 4, label: "Thursday", isWeekend: false },
                      { day: 5, label: "Friday", isWeekend: false },
                      { day: 6, label: "Saturday", isWeekend: true },
                      { day: 0, label: "Sunday", isWeekend: true },
                    ].map(({ day, label, isWeekend }) => {
                      const row = dayPricingRows[day] || { price: "", origPrice: "", active: true };
                      const priceVal = parseFloat(row.price);
                      const origVal = parseFloat(row.origPrice);
                      const hasDiscount = origVal > 0 && origVal > priceVal;
                      const discPercent = hasDiscount ? Math.round(((origVal - priceVal) / origVal) * 100) : null;

                      return (
                        <div
                          key={day}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            isWeekend
                              ? "bg-amber-500/5 border-amber-500/20"
                              : "bg-slate-800/60 border-slate-700/60"
                          }`}
                        >
                          <div className="w-28 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-white">{label}</span>
                              {isWeekend && (
                                <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                  Weekend
                                </span>
                              )}
                            </div>
                            {discPercent !== null && (
                              <span className="text-[10px] text-green-400 font-bold">{discPercent}% OFF</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-slate-400 uppercase">Price (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.price}
                                onChange={(e) => handleDayPriceChange(day, "price", e.target.value)}
                                className="w-24 h-8 text-xs bg-slate-800 border-slate-700 text-white"
                                placeholder="₹"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-slate-500 uppercase">Orig. (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.origPrice}
                                onChange={(e) => handleDayPriceChange(day, "origPrice", e.target.value)}
                                className="w-24 h-8 text-xs bg-slate-800 border-slate-700 text-slate-400 placeholder:text-slate-600"
                                placeholder="Cut ₹"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDayPricingProduct(null)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || loadingDayPricing}
              onClick={handleSaveDayPricing}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {dayPricingSavedMessage ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Saved!
                </>
              ) : (
                "Save Day Rates"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this product? It will be removed from the menu.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteId(null)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              disabled={isPending}
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600 text-white font-medium"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

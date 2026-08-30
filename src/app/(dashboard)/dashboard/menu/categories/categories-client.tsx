"use client";

import { useState, useTransition } from "react";
import { Category } from "@/types/database";
import { createCategory, updateCategory, deleteCategory } from "@/lib/menu/category-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AlertCircle, Edit, Loader2, Plus, Trash2 } from "lucide-react";

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenNew = () => {
    setEditingCategory(null);
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      setError(null);
      let res;
      
      if (editingCategory) {
        res = await updateCategory(editingCategory.id, formData);
      } else {
        res = await createCategory(formData);
      }

      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
        // Next.js revalidatePath will refresh the page data
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await deleteCategory(id);
      if (res?.error) {
        // Find a way to show error, maybe set main error state
        setError(res.error);
      } else {
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleOpenNew} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800/80">
            <TableRow className="border-slate-700/60 hover:bg-transparent">
              <TableHead className="text-slate-300 font-medium">Name</TableHead>
              <TableHead className="text-slate-300 font-medium w-32 text-center">Display Order</TableHead>
              <TableHead className="text-slate-300 font-medium w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialCategories.length === 0 ? (
              <TableRow className="border-slate-700/60 hover:bg-slate-800/50">
                <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                  No categories found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              initialCategories.map((category) => (
                <TableRow key={category.id} className="border-slate-700/60 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-slate-200">{category.name}</TableCell>
                  <TableCell className="text-center text-slate-400">{category.display_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(category)}
                        className="text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(category.id)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Categories are used to group products on the menu.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200">Category Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingCategory?.name}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20"
                placeholder="e.g. Popcorn & Snacks"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="display_order" className="text-slate-200">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                min="0"
                defaultValue={editingCategory?.display_order || ""}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20"
                placeholder="Leave blank to auto-append"
              />
            </div>

            <DialogFooter className="pt-2">
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
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this category? Products in this category will also be hidden from the menu.
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

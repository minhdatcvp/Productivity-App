"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogManager } from "@/components/learn/CatalogManager";
import { AccountSettings } from "@/components/settings/AccountSettings";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cài đặt</h1>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="account">Tài khoản</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <CatalogManager />
        </TabsContent>

        <TabsContent value="account" className="mt-4">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

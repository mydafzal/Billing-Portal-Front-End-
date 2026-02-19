'use client';

import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Topbar() {
  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-gray-900">
        Dashboard
      </h1>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          admin@katana.com
        </span>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
        >
          <User size={18} />
        </Button>
      </div>
    </div>
  );
}

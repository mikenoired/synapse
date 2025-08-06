'use client';

import { trpc } from '@/shared/api/trpc';
import { Card } from '@/shared/ui/card';

export default function GeneralTab() {
  const { data: user } = trpc.user.getUser.useQuery();

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Основная информация</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <span>{user?.email}</span>
        </div>
        <div>
          <label className='block mb-1 font-medium'>Мозгует с {new Date(user?.created_at || '').toLocaleDateString()}</label>
        </div>
      </div>
    </Card>
  );
}
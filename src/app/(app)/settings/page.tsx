import { SettingsClient } from "@/components/settings/settings-client";
import { SetupNotice } from "@/components/setup/setup-notice";
import { loadCategories } from "@/lib/app-data";

export default async function SettingsPage() {
  const categoriesResult = await loadCategories();

  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-slate-800">설정</h1>
      <p className="mb-6 text-sm text-slate-500">
        카테고리를 추가·수정·삭제할 수 있습니다.
      </p>
      <SettingsClient categories={categoriesResult.data} />
    </main>
  );
}

import { getCategories, seedDefaultCategoriesIfNeeded } from "@/actions/categories";
import { getEntries } from "@/actions/entries";
import { getActiveSpace } from "@/actions/space";
import type { Category, Entry, Space } from "@/lib/types";
import { isSchemaSetupError } from "@/lib/supabase/errors";

export type AppDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; needsSetup: true };

export async function loadCategories(
  space?: Space,
): Promise<AppDataResult<Category[]>> {
  try {
    const activeSpace = space ?? (await getActiveSpace());
    let categories = await getCategories(activeSpace);

    if (categories.length === 0) {
      await seedDefaultCategoriesIfNeeded();
      categories = await getCategories(activeSpace);
    }

    return { ok: true, data: categories };
  } catch (error) {
    if (isSchemaSetupError(error)) {
      return { ok: false, needsSetup: true };
    }
    throw error;
  }
}

export async function loadEntries(
  filters?: Parameters<typeof getEntries>[0] & { space?: Space },
): Promise<AppDataResult<Entry[]>> {
  try {
    const entries = await getEntries(filters);
    return { ok: true, data: entries };
  } catch (error) {
    if (isSchemaSetupError(error)) {
      return { ok: false, needsSetup: true };
    }
    throw error;
  }
}

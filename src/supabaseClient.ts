import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf'
]);

export async function uploadEstimateFile(file: File): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed. Upload images or PDFs only.`);
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const filePath = `uploads/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('estimates')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('estimates').getPublicUrl(filePath);
  return data.publicUrl;
}

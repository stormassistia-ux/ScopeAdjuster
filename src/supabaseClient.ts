import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadEstimateFile(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `uploads/${fileName}`

  let { error: uploadError } = await supabase.storage
    .from('estimates')
    .upload(filePath, file)

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage
    .from('estimates')
    .getPublicUrl(filePath)

  return data.publicUrl
}

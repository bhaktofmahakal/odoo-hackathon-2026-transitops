import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage in the specified bucket
 * @param bucket Bucket name (e.g. 'vehicle-documents')
 * @param path File path inside the bucket
 * @param file File object
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Attempt to upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      // If bucket does not exist, let's log and return error
      return { url: null, error: error.message };
    }

    // Retrieve public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err.message || 'An unknown error occurred during upload' };
  }
}

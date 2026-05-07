import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { getSupabase } from './supabase';

const TARGET_WIDTH = 1280;
const TARGET_QUALITY = 0.6;
const MAX_BYTES = 200 * 1024;

export interface PickedReceipt {
  localUri: string;
  bytes: number;
}

async function compress(uri: string): Promise<PickedReceipt> {
  let quality = TARGET_QUALITY;
  let result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: TARGET_WIDTH } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  let size = new File(result.uri).info().size ?? 0;
  while (size > MAX_BYTES && quality > 0.2) {
    quality -= 0.1;
    result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: TARGET_WIDTH } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
    );
    size = new File(result.uri).info().size ?? 0;
  }
  return { localUri: result.uri, bytes: size };
}

export async function pickAndCompress(): Promise<PickedReceipt | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 1,
    allowsEditing: false,
  });
  if (picked.canceled) return null;

  const asset = picked.assets[0];
  if (!asset) return null;

  return compress(asset.uri);
}

export async function takePhotoAndCompress(): Promise<PickedReceipt | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const taken = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    quality: 1,
    allowsEditing: false,
  });
  if (taken.canceled) return null;

  const asset = taken.assets[0];
  if (!asset) return null;

  return compress(asset.uri);
}

export async function uploadReceipt(args: {
  user_id: string;
  txn_id: string;
  localUri: string;
}): Promise<string> {
  const { user_id, txn_id, localUri } = args;
  const timestamp = Date.now();
  const path = `${user_id}/${txn_id}/${timestamp}.jpg`;

  const base64 = await new File(localUri).base64();
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;
  return path;
}

export async function signedReceiptUrl(
  path: string,
  ttlSeconds = 600,
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, ttlSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

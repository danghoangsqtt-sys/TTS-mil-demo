// In a real Electron app, this would use Node.js `crypto` module.
// Here we use Web Crypto API to simulate the security requirement securely in the browser.

const ENC_ALGO = {
  name: "AES-GCM",
  length: 256
};

// Generate a static key for this demo session (in prod, this would be managed securely)
let key: CryptoKey | null = null;

const getKey = async (): Promise<CryptoKey> => {
  if (key) return key;
  // Deriving a key from a hardcoded phrase for persistence across reloads in this demo
  // In real app: managed via secure storage or user password
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode("SQTT_SECRET_MILITARY_KEY_2025"),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("SQTT_SALT"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
};

// Encrypt text to Base64 string (IV + Ciphertext)
export const encryptText = async (text: string): Promise<string> => {
  try {
    const k = await getKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      k,
      encodedText
    );

    const encryptedArray = new Uint8Array(encryptedContent);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);

    // Convert to Base64
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return window.btoa(binary);
  } catch (e) {
    console.error("Encryption failed", e);
    throw new Error("Encryption failed");
  }
};

// Decrypt Base64 string to Text
export const decryptText = async (encryptedBase64: string): Promise<string> => {
  try {
    const k = await getKey();
    const binaryString = window.atob(encryptedBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      k,
      data
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    console.error("Decryption failed", e);
    return "Error: Cannot decrypt";
  }
};
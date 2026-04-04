/**
 * crypto-utils.ts
 * 对称加密/解密与哈希工具库 (集成 zlib 压缩)
 */

import * as pako from "pako";

// ========== 常量配置 ==========
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 字节
const IV_LENGTH = 12; // AES-GCM 推荐 12 字节
const KEY_LENGTH = 256; // AES-256

// ========== 辅助函数 ==========
function strToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function uint8ToBase64(uint8: Uint8Array): string {
  return btoa(String.fromCharCode(...uint8));
}

export function base64ToUint8(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * 从密码派生密钥 (PBKDF2 + SHA-256)
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    strToUint8(password) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

// ========== 底层加密/解密（处理 Uint8Array） ==========
/**
 * 加密二进制数据
 * @param data 原始二进制数据（如压缩后的数据）
 * @param password 密码
 * @returns Base64 编码的密文（含 salt+iv+ciphertext）
 */
export async function encryptBinary(
  data: Uint8Array,
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );

  // 组合: salt + iv + ciphertext
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength,
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return uint8ToBase64(combined);
}

/**
 * 解密二进制数据
 * @param encryptedBase64 Base64 密文
 * @param password 密码
 * @returns 解密后的原始二进制数据
 */
export async function decryptBinary(
  encryptedBase64: string,
  password: string,
): Promise<Uint8Array> {
  const combined = base64ToUint8(encryptedBase64);
  if (combined.length < SALT_LENGTH + IV_LENGTH) {
    throw new Error("Invalid encrypted data");
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    return new Uint8Array(decrypted);
  } catch (err) {
    throw new Error("Decryption failed: wrong password or corrupted data");
  }
}

// ========== 对外接口（自动压缩/解压） ==========
/**
 * 加密文本（先压缩，后加密）
 * @param plaintext 原始文本
 * @param password 加密密码
 * @returns Base64 密文
 */
export async function encrypt(
  plaintext: string,
  password: string,
): Promise<string> {
  // 1. 压缩文本为二进制
  const compressed = pako.deflate(plaintext);
  // 2. 加密二进制数据
  return encryptBinary(compressed, password);
}

/**
 * 解密文本（先解密，后解压）
 * @param encryptedBase64 Base64 密文
 * @param password 解密密码
 * @returns 原始文本
 */
export async function decrypt(
  encryptedBase64: string,
  password: string,
): Promise<string> {
  // 1. 解密得到压缩后的二进制数据
  const compressed = await decryptBinary(encryptedBase64, password);
  // 2. 解压为原始文本
  try {
    return pako.inflate(compressed, { to: "string" });
  } catch (err) {
    throw new Error("Decompression failed: data may be corrupted");
  }
}

// ========== 其他工具函数保持不变 ==========
export async function hash(data: string): Promise<string> {
  const encoded = strToUint8(data);
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoded as BufferSource,
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

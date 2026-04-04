// clipboard-client.ts

import { decrypt, encrypt, hash } from "./utils/crypto.ts";

export interface Attachment {
  name: string;
  data: string;
  MINE: string;
}

export const Identity = {
  Admin: "ADMIN",
  User: "USER",
};

export type Identity = keyof typeof Identity;

interface Attachments {
  files: Attachment[];
  admin_key: string;
}

export interface CreateOptions {
  id?: string;
  expirationTtl?: number;
  pwd?: string | null;
  file?: Attachments;
}

export interface CreateResponse {
  success: true;
  key: string;
  url: string;
}

export interface UpdateOptions {
  old_pwd?: string | null;
  new_pwd?: string | null;
  file?: Attachments;
}

export interface UpdateResponse {
  success: true;
  key: string;
  url: string;
}

export interface DeleteResponse {
  success: true;
  key: string;
}

export interface GetResponse {
  content: string;
  pwd: string | null;
  creationTime: number;
  deadTime: number;
  identity: Identity;
  files: Attachment[];
}

export class ClipboardClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * 创建新内容
   * @param content 文本内容
   * @param options 可选参数（ID、过期时间、密码）
   * @returns 创建结果
   * @throws {ClipboardError} 当请求失败时抛出，可通过 error.status 和 error.message 区分
   */
  async create(
    content: string,
    options?: CreateOptions,
  ): Promise<CreateResponse> {
    const payload: any = { content };
    if (options?.id) payload.id = options.id;
    if (options?.expirationTtl) payload.expirationTtl = options.expirationTtl;
    if (options?.file) {
      payload.files = options.file.files;
      payload.admin_key = options.file.admin_key;
    }
    if (options?.pwd) {
      payload.pwd = await hash(options.pwd);
      payload.content = await encrypt(content, options.pwd);
    }

    const response = await fetch(`${this.baseUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ClipboardError(
        error.error || "Request failed",
        response.status,
      );
    }

    const data = await response.json();
    if (!data.success) {
      throw new ClipboardError("Create failed", 500);
    }
    return data;
  }

  /**
   * 获取内容（需要密码）
   * @param id 内容 ID
   * @param pwd 密码（如果创建时设置了密码）
   * @returns 完整的内容数据
   */
  async get(id: string, pwd?: string | null): Promise<GetResponse> {
    const payload: any = { get: true };
    if (pwd) payload.pwd = await hash(pwd);

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ClipboardError(
        error.error || "Request failed",
        response.status,
      );
    }

    const res = (await response.json()) as GetResponse;

    if (res.pwd) {
      res.content = await decrypt(res.content, pwd as string);
      res.pwd = pwd as string;
    }

    return res;
  }

  /**
   * 更新内容
   * @param id 内容 ID
   * @param content 新内容
   * @param options 原密码、新密码
   */
  async update(
    id: string,
    content: string,
    options?: UpdateOptions,
  ): Promise<UpdateResponse> {
    const payload: any = { content };
    if (options?.old_pwd) payload.old_pwd = await hash(options.old_pwd);
    if (options?.new_pwd) {
      payload.new_pwd = await hash(options.new_pwd);
      payload.content = await encrypt(content, options.new_pwd);
    }
    if (options?.file) {
      payload.files = options.file.files;
      payload.admin_key = options.file.admin_key;
    }

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ClipboardError(
        error.error || "Request failed",
        response.status,
      );
    }

    const data = await response.json();
    if (!data.success) {
      throw new ClipboardError("Update failed", 500);
    }
    return data;
  }

  /**
   * 删除内容
   * @param id 内容 ID
   * @param pwd 密码（如果创建时设置了密码）
   */
  async delete(id: string, pwd?: string | null): Promise<DeleteResponse> {
    const payload: any = {};
    if (pwd) payload.pwd = await hash(pwd);

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ClipboardError(
        error.error || "Request failed",
        response.status,
      );
    }

    const data = await response.json();
    if (!data.success) {
      throw new ClipboardError("Delete failed", 500);
    }
    return data;
  }
}

export class ClipboardError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ClipboardError";
  }
}



export interface KVNamespace {
  get(key: string, options?: any): Promise<any>;
  put(key: string, value: any, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
  getWithMetadata<T = unknown>(key: string): Promise<{ value: any; metadata: T }>;
}

export type Env = {
  /** KVSync 数据存储 */
  KV_SYNC: KVNamespace;
  /** 管理员登录密码（前端管理页面登录 + 管理面 API Bearer 认证共用） */
  PASSWORD: string;
};

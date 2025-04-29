// 로컬 스토리지 및 IndexedDB 유틸리티 함수

import { openDB, DBSchema, IDBPDatabase } from "idb";

// 데이터베이스 이름 및 버전
const DB_NAME = "notify-app-db";
const DB_VERSION = 1;

// 데이터베이스 스키마 정의
interface NotifyAppDB extends DBSchema {
  accounts: {
    key: string;
    value: Account;
    indexes: {
      "by-name": string;
      "by-server": string;
    };
  };
  templates: {
    key: string;
    value: NotificationTemplate;
    indexes: {
      "by-account": string;
      "by-last-used": number;
    };
  };
}

// 타입 정의
export interface ServerConfig {
  id: string;
  name: string;
  domain: string;
  loginUrl: string;
  subscribeUrl: string;
  notifyUrl: string;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    messagingSenderId: string;
    appId: string;
  };
}

export interface SavedAccount {
  id: string;
  serverId: string; // 연결된 서버 ID
  email: string;
  password: string; // 실제 앱에서는 보안을 위해 암호화 고려 필요
  name?: string; // 계정 표시 이름 (선택)
  lastLogin?: number; // 마지막 로그인 시간
  token?: string; // 최근 인증 토큰 (선택, 자동 로그인용)
}

export interface NotificationTemplate {
  id: string;
  accountId: string; // 연결된 계정 ID
  name: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
}

// 계정 인터페이스
export interface Account {
  id: string;
  name?: string;
  email: string;
  server: string;
  serverConfig?: ServerConfig;
  createdAt: number;
  updatedAt: number;
}

// 데이터베이스 연결 가져오기
async function getDB(): Promise<IDBPDatabase<NotifyAppDB>> {
  return openDB<NotifyAppDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 계정 저장소
      if (!db.objectStoreNames.contains("accounts")) {
        const accountStore = db.createObjectStore("accounts", {
          keyPath: "id",
        });
        accountStore.createIndex("by-name", "name");
        accountStore.createIndex("by-server", "server");
      }

      // 템플릿 저장소
      if (!db.objectStoreNames.contains("templates")) {
        const templateStore = db.createObjectStore("templates", {
          keyPath: "id",
        });
        templateStore.createIndex("by-account", "accountId");
        templateStore.createIndex("by-last-used", "lastUsed");
      }
    },
  });
}

// 계정 저장소 유틸리티
export const accountStorage = {
  async getAll(): Promise<Account[]> {
    const db = await getDB();
    return db.getAll("accounts");
  },

  async get(id: string): Promise<Account | undefined> {
    const db = await getDB();
    return db.get("accounts", id);
  },

  async save(account: Partial<Account> & { id?: string }): Promise<Account> {
    const db = await getDB();
    const now = Date.now();

    const newAccount: Account = {
      id:
        account.id ||
        `account_${now}_${Math.random().toString(36).substring(2, 9)}`,
      name: account.name || "",
      email: account.email || "",
      server: account.server || "",
      serverConfig: account.serverConfig,
      createdAt: account.id
        ? (await this.get(account.id))?.createdAt || now
        : now,
      updatedAt: now,
    };

    await db.put("accounts", newAccount);
    return newAccount;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("accounts", id);
  },
};

// 템플릿 저장소 유틸리티
export const templateStorage = {
  async getAll(): Promise<NotificationTemplate[]> {
    const db = await getDB();
    return db.getAll("templates");
  },

  getByAccountId(accountId: string): Promise<NotificationTemplate[]> {
    return this.getAllByIndex("by-account", accountId);
  },

  async getAllByIndex(
    indexName: "by-account" | "by-last-used",
    value: string | number
  ): Promise<NotificationTemplate[]> {
    const db = await getDB();
    return db.getAllFromIndex("templates", indexName, value);
  },

  async get(id: string): Promise<NotificationTemplate | undefined> {
    const db = await getDB();
    return db.get("templates", id);
  },

  async save(
    template: Partial<NotificationTemplate> & { accountId: string }
  ): Promise<NotificationTemplate> {
    const db = await getDB();
    const now = Date.now();

    const newTemplate: NotificationTemplate = {
      id:
        template.id ||
        `template_${now}_${Math.random().toString(36).substring(2, 9)}`,
      accountId: template.accountId,
      name: template.name || `템플릿 ${now}`,
      title: template.title || "",
      body: template.body || "",
      data: template.data,
      createdAt: template.id
        ? (await this.get(template.id))?.createdAt || now
        : now,
      updatedAt: now,
      lastUsed: template.id
        ? (await this.get(template.id))?.lastUsed
        : undefined,
    };

    await db.put("templates", newTemplate);
    return newTemplate;
  },

  async updateLastUsed(id: string): Promise<void> {
    const db = await getDB();
    const template = await this.get(id);

    if (template) {
      template.lastUsed = Date.now();
      await db.put("templates", template);
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("templates", id);
  },
};

// 서버 설정 관리
export const serverStorage = {
  // 모든 서버 설정 가져오기
  getAll: (): ServerConfig[] => {
    try {
      const savedConfigs = localStorage.getItem("serverConfigs");
      return savedConfigs ? JSON.parse(savedConfigs) : [];
    } catch (error) {
      console.error("서버 설정 로드 실패:", error);
      return [];
    }
  },

  // 특정 서버 설정 가져오기
  getById: (id: string): ServerConfig | null => {
    const configs = serverStorage.getAll();
    return configs.find((config) => config.id === id) || null;
  },

  // 서버 설정 저장
  save: (config: Partial<ServerConfig>): ServerConfig => {
    const configs = serverStorage.getAll();
    let updatedConfig: ServerConfig;

    // ID 존재 여부 확인
    const existingIndex = config.id
      ? configs.findIndex((c) => c.id === config.id)
      : -1;

    if (existingIndex >= 0) {
      // 기존 설정 업데이트
      updatedConfig = {
        ...configs[existingIndex],
        ...config,
      } as ServerConfig;
      configs[existingIndex] = updatedConfig;
    } else {
      // 새 설정 추가
      updatedConfig = {
        ...config,
        id: Date.now().toString(),
      } as ServerConfig;
      configs.push(updatedConfig);
    }

    // 저장
    localStorage.setItem("serverConfigs", JSON.stringify(configs));
    return updatedConfig;
  },

  // 서버 설정 삭제
  delete: (id: string): void => {
    const configs = serverStorage.getAll().filter((config) => config.id !== id);
    localStorage.setItem("serverConfigs", JSON.stringify(configs));

    // 관련된 계정도 삭제
    const savedAccounts = JSON.parse(
      localStorage.getItem("savedAccounts") || "[]"
    ) as SavedAccount[];
    const updatedAccounts = savedAccounts.filter(
      (account) => account.serverId !== id
    );
    localStorage.setItem("savedAccounts", JSON.stringify(updatedAccounts));
  },

  // 최근 선택한 서버 ID 저장
  saveLastSelected: (id: string): void => {
    localStorage.setItem("lastSelectedServerId", id);
  },

  // 최근 선택한 서버 ID 가져오기
  getLastSelected: (): string | null => {
    return localStorage.getItem("lastSelectedServerId");
  },
};

// 저장된 계정 관리 유틸리티
export const savedAccountStorage = {
  getAll(): SavedAccount[] {
    try {
      const accounts = localStorage.getItem("savedAccounts");
      return accounts ? JSON.parse(accounts) : [];
    } catch (error) {
      console.error("저장된 계정 로드 실패:", error);
      return [];
    }
  },

  getById(id: string): SavedAccount | null {
    const accounts = this.getAll();
    return accounts.find((acc) => acc.id === id) || null;
  },

  getByServerId(serverId: string): SavedAccount[] {
    const accounts = this.getAll();
    return accounts.filter((acc) => acc.serverId === serverId);
  },

  save(account: Partial<SavedAccount> & { serverId: string }): SavedAccount {
    const accounts = this.getAll();
    const now = Date.now();

    let newAccount: SavedAccount;
    const existingIndex = account.id
      ? accounts.findIndex((acc) => acc.id === account.id)
      : -1;

    if (existingIndex >= 0) {
      // 기존 계정 업데이트
      newAccount = {
        ...accounts[existingIndex],
        ...account,
        lastLogin: account.lastLogin || accounts[existingIndex].lastLogin,
      };
      accounts[existingIndex] = newAccount;
    } else {
      // 새 계정 추가
      newAccount = {
        id: `saved_account_${now}_${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        serverId: account.serverId,
        email: account.email || "",
        password: account.password || "",
        name: account.name || "",
        lastLogin: account.lastLogin || now,
        token: account.token,
      };
      accounts.push(newAccount);
    }

    localStorage.setItem("savedAccounts", JSON.stringify(accounts));
    return newAccount;
  },

  delete(id: string): void {
    const accounts = this.getAll().filter((acc) => acc.id !== id);
    localStorage.setItem("savedAccounts", JSON.stringify(accounts));
  },
};

// FCM 설정을 IndexedDB에 저장
export const saveFCMConfigToDB = async (
  config: ServerConfig["firebaseConfig"]
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    try {
      const request = indexedDB.open("fcm-config-db", 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("config")) {
          db.createObjectStore("config", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("config", "readwrite");
        const store = transaction.objectStore("config");

        const saveRequest = store.put({
          id: "current-config",
          config: config,
          timestamp: Date.now(),
        });

        saveRequest.onsuccess = () => {
          console.log("FCM 설정이 IndexedDB에 저장되었습니다");
          resolve();
        };

        saveRequest.onerror = () => {
          console.error("FCM 설정 저장 실패:", saveRequest.error);
          reject(new Error("FCM 설정을 저장하지 못했습니다"));
        };
      };

      request.onerror = () => {
        console.error("IndexedDB를 열 수 없습니다:", request.error);
        reject(new Error("IndexedDB에 접근할 수 없습니다"));
      };
    } catch (error) {
      console.error("FCM 설정 저장 중 오류:", error);
      reject(error);
    }
  });
};

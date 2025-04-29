"use client";
import { useState, useEffect } from "react";
import {
  SavedAccount,
  ServerConfig,
  savedAccountStorage,
} from "../lib/storage";
import AccountForm from "./AccountForm";

interface AccountListProps {
  server: ServerConfig;
  onSelectAccount?: (account: SavedAccount) => void;
}

export default function AccountList({
  server,
  onSelectAccount,
}: AccountListProps) {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(
    null
  );

  // Load accounts when server changes
  useEffect(() => {
    const serverAccounts = savedAccountStorage.getByServerId(server.id);
    setAccounts(serverAccounts);
  }, [server.id]);

  const handleSaveAccount = (account: SavedAccount) => {
    console.log("Saved account:", account.id);
    setAccounts(savedAccountStorage.getByServerId(server.id));
    setShowAddForm(false);
    setSelectedAccount(null);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm("이 계정을 삭제하시겠습니까?")) {
      savedAccountStorage.delete(accountId);
      setAccounts(savedAccountStorage.getByServerId(server.id));
    }
  };

  const handleEditAccount = (account: SavedAccount) => {
    setSelectedAccount(account);
    setShowAddForm(true);
  };

  // 계정 선택 핸들러
  const handleAccountClick = (account: SavedAccount) => {
    if (onSelectAccount) {
      onSelectAccount(account);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">계정 관리</h2>
        <button
          onClick={() => {
            setSelectedAccount(null);
            setShowAddForm(true);
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          계정 추가
        </button>
      </div>

      {showAddForm ? (
        <div className="p-4 border rounded-md">
          <AccountForm
            serverId={server.id}
            serverName={server.name}
            initialData={selectedAccount}
            onSave={handleSaveAccount}
            onCancel={() => {
              setShowAddForm(false);
              setSelectedAccount(null);
            }}
          />
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-md text-gray-500 text-center">
          저장된 계정이 없습니다. 새 계정을 추가해보세요.
        </div>
      ) : (
        <ul className="border rounded-md divide-y">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="p-3 flex justify-between items-center cursor-pointer hover:bg-blue-50"
              onClick={() => handleAccountClick(account)}
            >
              <div>
                <h3 className="font-medium">{account.name || account.email}</h3>
                <p className="text-sm text-gray-500">{account.email}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAccount(account);
                  }}
                  className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  수정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAccount(account.id);
                  }}
                  className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

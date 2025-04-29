"use client";

import { useState, useEffect } from "react";
import { serverStorage, ServerConfig } from "./lib/storage";
import ServerForm from "./components/ServerForm";
import ServerManagement from "./components/ServerManagement";
import ServiceWorkerManager from "./ServiceWorkerManager";

export default function Home() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [showServerForm, setShowServerForm] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);

  // Load servers and last selected server
  useEffect(() => {
    const loadedServers = serverStorage.getAll();
    setServers(loadedServers);

    const lastSelected = serverStorage.getLastSelected();
    if (lastSelected && loadedServers.some((s) => s.id === lastSelected)) {
      setSelectedServerId(lastSelected);
    } else if (loadedServers.length > 0) {
      setSelectedServerId(loadedServers[0].id);
    }
  }, []);

  const handleServerSave = (server: ServerConfig) => {
    setServers(serverStorage.getAll());
    setSelectedServerId(server.id);
    serverStorage.saveLastSelected(server.id);
    setShowServerForm(false);
    setEditingServer(null);
  };

  const handleServerSelect = (id: string) => {
    setSelectedServerId(id);
    serverStorage.saveLastSelected(id);
  };

  const handleServerEdit = (server: ServerConfig) => {
    setEditingServer(server);
    setShowServerForm(true);
  };

  const handleServerDelete = (id: string) => {
    if (
      confirm(
        "이 서버 설정을 삭제하시겠습니까? 연결된 모든 계정 데이터도 삭제됩니다."
      )
    ) {
      serverStorage.delete(id);
      setServers(serverStorage.getAll());

      if (selectedServerId === id) {
        const remainingServers = serverStorage.getAll();
        if (remainingServers.length > 0) {
          setSelectedServerId(remainingServers[0].id);
          serverStorage.saveLastSelected(remainingServers[0].id);
        } else {
          setSelectedServerId(null);
        }
      }
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* 서버 목록 사이드바 */}
        <div className="md:w-64 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">서버 목록</h2>
            <button
              onClick={() => {
                setEditingServer(null);
                setShowServerForm(true);
              }}
              className="px-2 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
            >
              새 서버
            </button>
          </div>

          {servers.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
              서버가 없습니다. 새 서버를 추가해보세요.
            </div>
          ) : (
            <ul className="border rounded-md divide-y">
              {servers.map((server) => (
                <li
                  key={server.id}
                  className={`p-3 cursor-pointer ${
                    selectedServerId === server.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div
                    className="flex justify-between items-center"
                    onClick={() => handleServerSelect(server.id)}
                  >
                    <div>
                      <h3 className="font-medium">{server.name}</h3>
                      <p className="text-xs text-gray-500">{server.domain}</p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleServerEdit(server);
                        }}
                        className="p-1 text-gray-500 hover:text-blue-500"
                      >
                        수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleServerDelete(server.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1">
          {showServerForm ? (
            <div className="border p-4 rounded-md">
              <h2 className="text-xl font-bold mb-4">
                {editingServer ? "서버 설정 수정" : "새 서버 추가"}
              </h2>
              <ServerForm
                initialData={editingServer}
                onSave={handleServerSave}
                onCancel={() => {
                  setShowServerForm(false);
                  setEditingServer(null);
                }}
              />
            </div>
          ) : (
            <ServerManagement serverId={selectedServerId || undefined} />
          )}
        </div>
      </div>

      {/* Service Worker Manager */}
      <ServiceWorkerManager />
    </main>
  );
}

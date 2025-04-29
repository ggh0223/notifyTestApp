"use client";
import { useState, useEffect } from "react";
import {
  ServerConfig,
  SavedAccount,
  NotificationTemplate,
  serverStorage,
} from "../lib/storage";
import { sendNotification } from "../lib/notificationService";
import AccountList from "./AccountList";
import NotificationForm from "./NotificationForm";
import TemplateList from "./TemplateList";

interface ServerManagementProps {
  serverId?: string;
}

export default function ServerManagement({ serverId }: ServerManagementProps) {
  const [server, setServer] = useState<ServerConfig | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load server data when serverId changes
  useEffect(() => {
    if (serverId) {
      const serverData = serverStorage.getById(serverId);
      setServer(serverData);
    }
  }, [serverId]);

  // Handle account selection
  const handleSelectAccount = (account: SavedAccount) => {
    setSelectedAccount(account);
    setSelectedTemplate(null);
  };

  // Handle template selection
  const handleSelectTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
  };

  // Handle notification sending
  const handleSendNotification = async (payload: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => {
    if (!server || !selectedAccount) {
      alert("서버 또는 계정을 선택해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // Use our notification service instead of direct Firebase calls
      await sendNotification(server, selectedAccount.token || "", payload);

      // Success message
      alert(`알림 전송 성공!\n제목: ${payload.title}\n내용: ${payload.body}`);
    } catch (error) {
      console.error(
        "알림 전송 실패:",
        error instanceof Error ? error.message : "알 수 없는 오류"
      );
      alert("알림 전송에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!server) {
    return <div className="text-center py-4">서버를 선택해주세요.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 p-4 rounded-md">
        <h1 className="text-2xl font-bold text-blue-800">{server.name}</h1>
        <p className="text-blue-600">{server.domain}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {/* 계정 관리 섹션 */}
          <AccountList server={server} onSelectAccount={handleSelectAccount} />
          <div className="mt-4 p-3 bg-yellow-50 rounded-md text-sm">
            <p className="text-yellow-700">
              계정을 선택하면 해당 계정으로 알림을 보낼 수 있습니다.
              <button
                onClick={() =>
                  handleSelectAccount({
                    id: "demo-account",
                    serverId: server.id,
                    email: "demo@example.com",
                    password: "",
                    name: "데모 계정",
                  })
                }
                className="ml-2 underline"
                disabled={isLoading}
              >
                데모 계정 사용
              </button>
            </p>
          </div>
        </div>

        <div>
          {selectedAccount ? (
            <div className="space-y-6">
              <div className="bg-green-50 p-3 rounded-md">
                <h2 className="font-medium text-green-800">
                  선택된 계정: {selectedAccount.name || selectedAccount.email}
                </h2>
                <p className="text-sm text-green-600">
                  {selectedAccount.email}
                </p>
              </div>

              {/* 템플릿 관리 및 알림 전송 폼 */}
              <div className="border p-4 rounded-md">
                <h2 className="text-xl font-semibold mb-4">알림 전송</h2>
                <NotificationForm
                  accountId={selectedAccount.id}
                  authToken={selectedAccount.token || ""}
                  notifyUrl={server.notifyUrl}
                  initialData={selectedTemplate}
                  onSend={handleSendNotification}
                />
              </div>

              <TemplateList
                accountId={selectedAccount.id}
                onSelect={handleSelectTemplate}
              />
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-md text-center">
              <p className="text-gray-500">
                좌측에서 계정을 선택하면 알림 전송 기능을 사용할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

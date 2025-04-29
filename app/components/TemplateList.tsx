"use client";
import { useState, useEffect } from "react";
import { NotificationTemplate, templateStorage } from "../lib/storage";

interface TemplateListProps {
  accountId: string;
  onSelect?: (template: NotificationTemplate) => void;
}

export default function TemplateList({
  accountId,
  onSelect,
}: TemplateListProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        const accountTemplates = await templateStorage.getByAccountId(
          accountId
        );
        setTemplates(accountTemplates);
      } catch (error) {
        console.error("템플릿 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [accountId]);

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("이 템플릿을 삭제하시겠습니까?")) {
      await templateStorage.delete(id);
      const updatedTemplates = await templateStorage.getByAccountId(accountId);
      setTemplates(updatedTemplates);
    }
  };

  if (loading) {
    return <div className="text-center py-4">템플릿 로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">알림 템플릿</h2>

      {templates.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-md text-gray-500 text-center">
          저장된 템플릿이 없습니다.
        </div>
      ) : (
        <ul className="border rounded-md divide-y">
          {templates.map((template) => (
            <li key={template.id} className="p-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{template.name}</h3>
                <div className="flex space-x-2">
                  {onSelect && (
                    <button
                      onClick={() => onSelect(template)}
                      className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      사용
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <p className="font-medium text-gray-700">{template.title}</p>
                <p className="text-gray-500">
                  {template.body.length > 50
                    ? template.body.substring(0, 50) + "..."
                    : template.body}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {template.lastUsed
                    ? `마지막 사용: ${new Date(
                        template.lastUsed
                      ).toLocaleString()}`
                    : "사용된 적 없음"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

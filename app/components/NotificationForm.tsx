"use client";
import { useState, useEffect } from "react";
import { NotificationTemplate, templateStorage } from "../lib/storage";

interface NotificationFormProps {
  accountId: string;
  initialData?: NotificationTemplate | null;
  onSave?: (template: NotificationTemplate) => void;
  onSend: (payload: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => Promise<void>;
  // Optional parameters for backward compatibility
  authToken?: string;
  notifyUrl?: string;
}

export default function NotificationForm({
  accountId,
  initialData,
  onSave,
  onSend,
  // Destructure but don't use these parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  authToken,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notifyUrl,
}: NotificationFormProps) {
  const [formData, setFormData] = useState<{
    name: string;
    title: string;
    body: string;
    dataJson: string;
  }>({
    name: "",
    title: "테스트 알림",
    body: "이것은 테스트 메시지입니다.",
    dataJson: JSON.stringify({ url: "/" }, null, 2),
  });

  const [savedTemplates, setSavedTemplates] = useState<NotificationTemplate[]>(
    []
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);

  // 초기 데이터 및 템플릿 로드
  useEffect(() => {
    async function loadTemplates() {
      try {
        // 템플릿 목록 로드
        const templates = await templateStorage.getByAccountId(accountId);
        setSavedTemplates(templates);
      } catch {
        console.error("템플릿 로드 실패");
      }
    }

    loadTemplates();

    // 초기 데이터 설정
    if (initialData) {
      setFormData({
        name: initialData.name,
        title: initialData.title,
        body: initialData.body,
        dataJson: initialData.data
          ? JSON.stringify(initialData.data, null, 2)
          : "{}",
      });
    }
  }, [accountId, initialData]);

  // 입력 필드 변경 처리
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "template") {
      setSelectedTemplate(value);

      if (value) {
        const template = savedTemplates.find((t) => t.id === value);
        if (template) {
          setFormData({
            name: template.name,
            title: template.title,
            body: template.body,
            dataJson: template.data
              ? JSON.stringify(template.data, null, 2)
              : "{}",
          });

          // 마지막 사용 시간 업데이트
          templateStorage.updateLastUsed(template.id);
        }
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // JSON 에러 초기화 (JSON 필드인 경우)
    if (name === "dataJson") {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch {
        setJsonError("유효한 JSON 형식이 아닙니다");
      }
    }
  };

  // 템플릿 저장
  const handleSaveTemplate = async () => {
    try {
      // JSON 파싱 검증
      const data = JSON.parse(formData.dataJson);

      // 템플릿 저장
      const template = await templateStorage.save({
        id: selectedTemplate || undefined, // 선택된 템플릿이 있으면 업데이트
        accountId,
        name: formData.name || `템플릿 ${savedTemplates.length + 1}`,
        title: formData.title,
        body: formData.body,
        data,
      });

      // 템플릿 목록 갱신
      const updatedTemplates = await templateStorage.getByAccountId(accountId);
      setSavedTemplates(updatedTemplates);
      setSelectedTemplate(template.id);
      setShowSaveForm(false);

      // 콜백 호출
      if (onSave) {
        onSave(template);
      }
    } catch {
      setJsonError("유효한 JSON 형식이 아닙니다");
    }
  };

  // 알림 전송
  const handleSendNotification = async () => {
    try {
      // JSON 파싱 검증
      const data = JSON.parse(formData.dataJson);

      setIsSending(true);

      // 알림 전송
      await onSend({
        title: formData.title,
        body: formData.body,
        data,
      });

      setIsSending(false);
    } catch {
      setJsonError("유효한 JSON 형식이 아닙니다");
      setIsSending(false);
    }
  };

  // 템플릿 삭제
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    await templateStorage.delete(selectedTemplate);
    const updatedTemplates = await templateStorage.getByAccountId(accountId);
    setSavedTemplates(updatedTemplates);
    setSelectedTemplate("");
  };

  // 템플릿 목록 UI
  const renderTemplateSelector = () => (
    <div className="flex items-center space-x-2 mb-4">
      <select
        name="template"
        value={selectedTemplate}
        onChange={handleChange}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
      >
        <option value="">-- 템플릿 선택 --</option>
        {savedTemplates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>

      {selectedTemplate && (
        <button
          type="button"
          onClick={handleDeleteTemplate}
          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          삭제
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowSaveForm(!showSaveForm)}
        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
      >
        {showSaveForm ? "취소" : selectedTemplate ? "수정" : "저장"}
      </button>
    </div>
  );

  // 템플릿 저장 폼 UI
  const renderSaveForm = () =>
    showSaveForm && (
      <div className="p-4 border border-blue-200 rounded-md bg-blue-50 mb-4">
        <h3 className="font-medium mb-3">템플릿 저장</h3>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            템플릿 이름
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="예: 중요 공지 템플릿"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveTemplate}
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {selectedTemplate ? "템플릿 업데이트" : "새 템플릿 저장"}
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      {renderTemplateSelector()}
      {renderSaveForm()}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          알림 제목
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="알림 제목 입력"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          알림 내용
        </label>
        <textarea
          name="body"
          value={formData.body}
          onChange={handleChange}
          placeholder="알림 내용 입력"
          className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          데이터 (JSON)
          <span className="text-xs text-gray-500 ml-1">선택사항</span>
        </label>
        <textarea
          name="dataJson"
          value={formData.dataJson}
          onChange={handleChange}
          placeholder='{"url": "/some-path", "id": "123"}'
          className={`w-full px-3 py-2 border rounded-md h-32 font-mono text-sm ${
            jsonError ? "border-red-500" : "border-gray-300"
          }`}
        />
        {jsonError && <p className="mt-1 text-sm text-red-500">{jsonError}</p>}
      </div>

      <div className="flex justify-end pt-3">
        <button
          type="button"
          onClick={handleSendNotification}
          disabled={isSending || !!jsonError}
          className={`px-4 py-2 rounded-md ${
            isSending || jsonError
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isSending ? "전송 중..." : "알림 전송"}
        </button>
      </div>
    </div>
  );
}

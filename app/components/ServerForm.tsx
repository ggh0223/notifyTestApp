"use client";
import { useState, useEffect } from "react";
import { ServerConfig, serverStorage } from "../lib/storage";

interface ServerFormProps {
  initialData?: ServerConfig | null;
  onSave: (server: ServerConfig) => void;
  onCancel?: () => void;
}

export default function ServerForm({
  initialData,
  onSave,
  onCancel,
}: ServerFormProps) {
  const [formData, setFormData] = useState<ServerConfig>({
    id: "",
    name: "",
    domain: "",
    loginUrl: "",
    subscribeUrl: "",
    notifyUrl: "",
    firebaseConfig: {
      apiKey: "",
      authDomain: "",
      projectId: "",
      messagingSenderId: "",
      appId: "",
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 초기 데이터로 폼 설정
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // 입력 필드 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Firebase 설정 필드인지 확인
    if (name.startsWith("firebase.")) {
      const firebaseField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        firebaseConfig: {
          ...prev.firebaseConfig,
          [firebaseField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // 에러 상태 초기화
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // 폼 제출 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("폼 제출이 시작되었습니다");

    // 입력 검증
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors["name"] = "서버 이름을 입력하세요";
    }

    if (!formData.domain?.trim()) {
      newErrors["domain"] = "도메인을 입력하세요";
    } else if (!formData.domain.startsWith("http")) {
      newErrors["domain"] = "도메인은 http:// 또는 https://로 시작해야 합니다";
    }

    if (!formData.loginUrl?.trim()) {
      newErrors["loginUrl"] = "로그인 URL을 입력하세요";
    }

    if (!formData.subscribeUrl?.trim()) {
      newErrors["subscribeUrl"] = "구독 URL을 입력하세요";
    }

    if (!formData.notifyUrl?.trim()) {
      newErrors["notifyUrl"] = "알림 전송 URL을 입력하세요";
    }

    if (!formData.firebaseConfig?.apiKey?.trim()) {
      newErrors["firebase.apiKey"] = "Firebase API Key를 입력하세요";
    }

    if (!formData.firebaseConfig?.projectId?.trim()) {
      newErrors["firebase.projectId"] = "Firebase Project ID를 입력하세요";
    }

    if (!formData.firebaseConfig?.messagingSenderId?.trim()) {
      newErrors["firebase.messagingSenderId"] =
        "Firebase Messaging Sender ID를 입력하세요";
    }

    if (!formData.firebaseConfig?.appId?.trim()) {
      newErrors["firebase.appId"] = "Firebase App ID를 입력하세요";
    }

    // 에러가 있으면 저장하지 않음
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      console.log("폼 검증 오류:", newErrors);
      return;
    }

    try {
      console.log("폼 검증 성공, 서버 저장 시도:", formData);
      // 입력이 유효하면 서버 설정 저장 및 콜백 호출
      const savedServer = serverStorage.save(formData);
      console.log("서버가 저장되었습니다:", savedServer);
      onSave(savedServer);
    } catch (error) {
      console.error("서버 저장 중 오류 발생:", error);
      alert("서버 설정을 저장하는 중 오류가 발생했습니다.");
    }
  };

  const generateUrlsFromDomain = () => {
    if (!formData.domain) return;

    const domain = formData.domain.endsWith("/")
      ? formData.domain.slice(0, -1)
      : formData.domain;

    setFormData((prev) => ({
      ...prev,
      loginUrl: `${domain}/auth/login`,
      subscribeUrl: `${domain}/notifications/subscribe`,
      notifyUrl: `${domain}/notifications/send`,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          서버 이름
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ""}
          onChange={handleChange}
          placeholder="예: 개발 서버"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          도메인
        </label>
        <div className="flex">
          <input
            type="text"
            name="domain"
            value={formData.domain || ""}
            onChange={handleChange}
            placeholder="예: https://api.example.com"
            className={`w-full px-3 py-2 border rounded-l-md ${
              errors.domain ? "border-red-500" : "border-gray-300"
            }`}
          />
          <button
            type="button"
            onClick={generateUrlsFromDomain}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300"
          >
            URL 생성
          </button>
        </div>
        {errors.domain && (
          <p className="mt-1 text-sm text-red-500">{errors.domain}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          로그인 URL
        </label>
        <input
          type="text"
          name="loginUrl"
          value={formData.loginUrl || ""}
          onChange={handleChange}
          placeholder="예: https://api.example.com/auth/login"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.loginUrl ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.loginUrl && (
          <p className="mt-1 text-sm text-red-500">{errors.loginUrl}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          구독 URL
        </label>
        <input
          type="text"
          name="subscribeUrl"
          value={formData.subscribeUrl || ""}
          onChange={handleChange}
          placeholder="예: https://api.example.com/notifications/subscribe"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.subscribeUrl ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.subscribeUrl && (
          <p className="mt-1 text-sm text-red-500">{errors.subscribeUrl}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          알림 전송 URL
        </label>
        <input
          type="text"
          name="notifyUrl"
          value={formData.notifyUrl || ""}
          onChange={handleChange}
          placeholder="예: https://api.example.com/notifications/send"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.notifyUrl ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.notifyUrl && (
          <p className="mt-1 text-sm text-red-500">{errors.notifyUrl}</p>
        )}
      </div>

      <div className="p-4 border rounded-md bg-gray-50">
        <h3 className="font-medium mb-3">Firebase 설정</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="text"
              name="firebase.apiKey"
              value={formData.firebaseConfig?.apiKey || ""}
              onChange={handleChange}
              placeholder="예: AIzaSyB..."
              className={`w-full px-3 py-2 border rounded-md ${
                errors["firebase.apiKey"] ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors["firebase.apiKey"] && (
              <p className="mt-1 text-sm text-red-500">
                {errors["firebase.apiKey"]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth Domain
            </label>
            <input
              type="text"
              name="firebase.authDomain"
              value={formData.firebaseConfig?.authDomain || ""}
              onChange={handleChange}
              placeholder="예: your-app.firebaseapp.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project ID
            </label>
            <input
              type="text"
              name="firebase.projectId"
              value={formData.firebaseConfig?.projectId || ""}
              onChange={handleChange}
              placeholder="예: your-project-id"
              className={`w-full px-3 py-2 border rounded-md ${
                errors["firebase.projectId"]
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {errors["firebase.projectId"] && (
              <p className="mt-1 text-sm text-red-500">
                {errors["firebase.projectId"]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Messaging Sender ID
            </label>
            <input
              type="text"
              name="firebase.messagingSenderId"
              value={formData.firebaseConfig?.messagingSenderId || ""}
              onChange={handleChange}
              placeholder="예: 123456789012"
              className={`w-full px-3 py-2 border rounded-md ${
                errors["firebase.messagingSenderId"]
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {errors["firebase.messagingSenderId"] && (
              <p className="mt-1 text-sm text-red-500">
                {errors["firebase.messagingSenderId"]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App ID
            </label>
            <input
              type="text"
              name="firebase.appId"
              value={formData.firebaseConfig?.appId || ""}
              onChange={handleChange}
              placeholder="예: 1:123456789012:web:abc123def456"
              className={`w-full px-3 py-2 border rounded-md ${
                errors["firebase.appId"] ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors["firebase.appId"] && (
              <p className="mt-1 text-sm text-red-500">
                {errors["firebase.appId"]}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          저장
        </button>
      </div>
    </form>
  );
}

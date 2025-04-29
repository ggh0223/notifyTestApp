"use client";
import { useState, useEffect } from "react";
import { SavedAccount, savedAccountStorage } from "../lib/storage";

interface AccountFormProps {
  serverId: string;
  serverName: string;
  initialData?: SavedAccount | null;
  onSave: (account: SavedAccount) => void;
  onCancel?: () => void;
}

export default function AccountForm({
  serverId,
  serverName,
  initialData,
  onSave,
  onCancel,
}: AccountFormProps) {
  const [formData, setFormData] = useState<Partial<SavedAccount>>({
    serverId,
    email: "",
    password: "",
    name: "",
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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

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

    // 입력 검증
    const newErrors: Record<string, string> = {};

    if (!formData.email?.trim()) {
      newErrors["email"] = "이메일을 입력하세요";
    } else if (!formData.email.includes("@")) {
      newErrors["email"] = "유효한 이메일 형식이 아닙니다";
    }

    if (!formData.password?.trim()) {
      newErrors["password"] = "비밀번호를 입력하세요";
    }

    // 에러가 있으면 저장하지 않음
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 이름이 없으면 이메일에서 생성
    if (!formData.name?.trim() && formData.email) {
      formData.name = formData.email.split("@")[0];
    }

    // 저장
    const savedAccount = savedAccountStorage.save({
      ...formData,
      serverId, // 서버 ID 재확인
    });

    onSave(savedAccount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-md mb-4">
        <p className="text-sm text-blue-600">
          <span className="font-medium">{serverName}</span> 서버에 계정 추가
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          계정 이름 (선택)
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ""}
          onChange={handleChange}
          placeholder="예: 개발자 계정"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="mt-1 text-xs text-gray-500">
          입력하지 않으면 이메일에서 자동 생성됩니다
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          이메일
        </label>
        <input
          type="email"
          name="email"
          value={formData.email || ""}
          onChange={handleChange}
          placeholder="example@email.com"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호
        </label>
        <input
          type="password"
          name="password"
          value={formData.password || ""}
          onChange={handleChange}
          placeholder="비밀번호 입력"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.password ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-500">{errors.password}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          비밀번호는 로컬에 저장되며, 자동 로그인에 사용됩니다.
        </p>
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
          계정 저장
        </button>
      </div>
    </form>
  );
}

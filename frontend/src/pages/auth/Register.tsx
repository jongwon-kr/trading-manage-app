import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/hooks/reduxHooks";
import { registerUser } from "@/store/slices/authSlice";
import { authAPI } from "@/api/auth.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [usernameCheckMessage, setUsernameCheckMessage] = useState("");

  useEffect(() => {
    setIsUsernameAvailable(null);
    setUsernameCheckMessage("");
  }, [username]);

  const handleCheckUsername = async () => {
    if (!username) {
      setUsernameCheckMessage("닉네임을 입력해주세요.");
      return;
    }
    setIsCheckingUsername(true);
    setUsernameCheckMessage("");
    try {
      const { isAvailable } = await authAPI.checkUsername(username);
      if (isAvailable) {
        setIsUsernameAvailable(true);
        setUsernameCheckMessage("사용 가능한 닉네임입니다.");
      } else {
        setIsUsernameAvailable(false);
        setUsernameCheckMessage("이미 사용 중인 닉네임입니다.");
      }
    } catch (err) {
      setIsUsernameAvailable(false);
      setUsernameCheckMessage("중복 확인 중 오류가 발생했습니다.");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !email || !password || !confirmPassword) {
      setError("모든 필드를 입력해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (isUsernameAvailable !== true) {
      setError("닉네임 중복 확인을 해주세요.");
      return;
    }

    try {
      const result = await dispatch(
        registerUser({ username, email, password })
      );

      if (registerUser.fulfilled.match(result)) {
        toast.success("회원가입 성공!", {
          description: "이제 로그인해주세요.",
        });
        navigate("/login");
      } else {
        setError(result.payload as string);
      }
    } catch (err) {
      setError("회원가입 실패");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md p-6 space-y-6 rounded-lg bg-white shadow">
        <h1 className="text-2xl font-bold text-center"></h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              닉네임
            </label>
            <div className="flex gap-2">
              <Input
                id="username"
                type="text"
                placeholder="사용할 닉네임"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckUsername}
                disabled={isCheckingUsername}
                className="w-28"
              >
                {isCheckingUsername ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "중복 확인"
                )}
              </Button>
            </div>
            {usernameCheckMessage && (
              <p
                className={`text-xs ${
                  isUsernameAvailable ? "text-green-600" : "text-red-600"
                } flex items-center gap-1`}
              >
                {isUsernameAvailable ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {usernameCheckMessage}
              </p>
            )}
          </div>

          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!isUsernameAvailable}
          >
            회원가입
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate("/login")}
          >
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Register;

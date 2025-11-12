import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// --- 경로 수정 ---
import { useAppDispatch } from '@/hooks/reduxHooks';
import { registerUser } from '@/store/slices/authSlice';
// --- 경로 수정 ---
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Register = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      const result = await dispatch(registerUser({ username, email, password, confirmPassword }));
      if (registerUser.fulfilled.match(result)) {
        navigate('/dashboard');
      } else {
        setError(result.payload as string);
      }
    } catch (err) {
      setError('회원가입 실패');
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md p-6 space-y-6 rounded-lg bg-white shadow">
        <h1 className="text-2xl font-bold text-center">회원가입</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}
          <Button type="submit" className="w-full">회원가입</Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/login')}>
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Register;
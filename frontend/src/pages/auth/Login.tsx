import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/reduxHooks';
import { loginUser } from '@/store/slices/authSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoginRequest } from '@/types/auth.types';

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const credentials: LoginRequest = { email, password }; 
      
      const result = await dispatch(loginUser(credentials));
      
      if (loginUser.fulfilled.match(result)) {
        navigate('/');
      } else {
        setError(result.payload as string);
      }
    } catch (err) {
      setError('로그인 실패');
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md p-6 space-y-6 rounded-lg bg-white shadow">
        <h1 className="text-2xl font-bold text-center">로그인</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}
          <Button type="submit" className="w-full">로그인</Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/register')}>
            회원가입
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
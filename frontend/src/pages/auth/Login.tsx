import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { loginUser } from '../../store/slices/authSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // loginUser thunk dispatch
      const result = await dispatch(loginUser({ username, password }));
      if (loginUser.fulfilled.match(result)) {
        navigate('/dashboard');
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
            type="text"
            placeholder="아이디"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
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

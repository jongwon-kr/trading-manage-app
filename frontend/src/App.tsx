import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

const Login = React.lazy(() => import('./pages/auth/Login'));
const Register = React.lazy(() => import('./pages/auth/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TradesList = React.lazy(() => import('./pages/trades/TradesList'));
const TradeForm = React.lazy(() => import('./pages/trades/TradeForm'));
const TradeDetail = React.lazy(() => import('./pages/trades/TradeDetail'));
const Analysis = React.lazy(() => import('./pages/Analysis'));

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <React.Suspense fallback={<div>로딩 중...</div>}>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/trades" element={
                <ProtectedRoute>
                  <TradesList />
                </ProtectedRoute>
              } />
              <Route path="/trades/new" element={
                <ProtectedRoute>
                  <TradeForm />
                </ProtectedRoute>
              } />
              <Route path="/trades/:id" element={
                <ProtectedRoute>
                  <TradeDetail />
                </ProtectedRoute>
              } />
              <Route path="/analysis" element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Login />} />
            </Routes>
          </Layout>
        </React.Suspense>
      </BrowserRouter>
    </Provider>
  );
}

export default App;

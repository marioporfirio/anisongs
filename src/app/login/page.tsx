// src/app/login/page.tsx
import AuthForm from '@/components/Auth';

export default function LoginPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-white text-center my-8">Acesse sua Conta</h1>
      <AuthForm />
    </div>
  );
}
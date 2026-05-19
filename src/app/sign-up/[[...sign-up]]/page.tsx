import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm mx-auto animate-fade-up">
        <SignUp />
      </div>
    </div>
  );
}

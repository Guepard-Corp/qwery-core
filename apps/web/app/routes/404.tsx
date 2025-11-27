import { useNavigate } from 'react-router';
import appConfig from '~/config/app.config';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[#101014] text-white">
      
      {/* Guepard Yellow 404 Badge */}
      <div
        className="
          rounded-full w-36 h-36 flex items-center justify-center
          bg-[#ffcb51]
          text-black
          shadow-[0_0_45px_rgba(255,203,81,0.55)]
        "
      >
        <span className="text-4xl font-extrabold">404</span>
      </div>

      {/* Title */}
      <h1 className="mt-8 text-3xl font-semibold text-[#ffcb51]">
        Ouch! :|
      </h1>

      {/* Description */}
      <p className="mt-2 text-lg text-zinc-400 max-w-xl">
        Sorry — the page you were looking for on{" "}
        <strong className="text-[#ffcb51]">{appConfig.title}</strong> does not exist.
      </p>

      {/* Buttons */}
      <div className="mt-6 flex gap-3">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="
            px-4 py-2 rounded-md border border-zinc-700 text-sm
            hover:border-[#ffcb51] hover:text-[#ffcb51] transition
          "
        >
          Go back
        </button>

        {/* Guepard Yellow Button */}
        <button
          onClick={() => navigate('/')}
          className="
            px-4 py-2 rounded-md text-black text-sm font-medium
            bg-[#ffcb51]
            hover:bg-[#ffd67a]
            transition shadow-[0_0_15px_rgba(255,203,81,0.4)]
            flex items-center gap-2
          "
        >
          Go to dashboard
        </button>
      </div>

      <p className="mt-6 text-xs text-zinc-600">
        If you think this is an error, please contact your administrator.
      </p>
    </div>
  );
}

import { useNavigate } from 'react-router';
import appConfig from '~/config/app.config';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-black text-white">
      {/* Orange glowing circular badge */}
      <div className="rounded-full w-36 h-36 flex items-center justify-center 
                      bg-gradient-to-br from-yellow-500 to-orange-600 
                      text-black shadow-[0_0_30px_rgba(251,191,36,0.6)]">
        <span className="text-4xl font-extrabold">404</span>
      </div>

      {/* Title */}
      <h1 className="mt-8 text-3xl font-semibold text-orange-400">Ouch! :|</h1>

      {/* Description */}
      <p className="mt-2 text-lg text-zinc-400 max-w-xl">
        Sorry — the page you were looking for on{" "}
        <strong className="text-orange-300">{appConfig.title}</strong> does not exist.
      </p>

      {/* Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-md border border-zinc-700 text-sm 
                     hover:border-orange-500 hover:text-orange-400 transition"
        >
          Go back
        </button>

        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-md bg-orange-600 text-black text-sm 
                     hover:bg-orange-500 transition shadow-[0_0_15px_rgba(251,146,60,0.5)]"
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

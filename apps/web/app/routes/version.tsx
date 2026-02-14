export default function Version() {
  return (
    <div>
      <p>Version: {import.meta.env.VITE_APP_VERSION}</p>
      <p>Git Hash: {import.meta.env.VITE_GIT_HASH}</p>
    </div>
  );
}

import dynamic from 'next/dynamic';
import Head from 'next/head';

const App = dynamic(() => import('@/App'), { ssr: false });

export default function CatchAll() {
  return (
    <>
      <Head>
        <title>Credovation Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <App />
    </>
  );
}

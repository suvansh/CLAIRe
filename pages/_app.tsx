import '../styles/globals.css';
import type { AppProps /*, AppContext */ } from 'next/app';
import Script from 'next/script'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script strategy="lazyOnload" id="github-buttons" src="https://buttons.github.io/buttons.js" />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp;

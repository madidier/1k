import b from './bulma.module.scss';
import { classes } from './utils';
import ghLogo from './assets/github-mark.svg';
import { useEffect, useState } from 'react';
import { decode } from './decode';
import { createWorker } from 'tesseract.js';

function App() {
  const [dragOver, setDragOver] = useState(false);
  const [input, setInput] = useState('');
  const { chunks, decoded } = decode(input);

  const [working, setWorking] = useState(false);

  async function readImage(input: File) {
    if (working) {
      return;
    }
    setWorking(true);
    try {
      const worker = await createWorker('eng');
      const result = await worker.recognize(input, undefined, { text: true });
      setInput(result.data.text);
    } catch (err) {
      setInput(JSON.stringify(err));
    } finally {
      setWorking(false);
    }
  }

  function handleDataTransfer(t: DataTransfer) {
    if (working || t.files.length != 1) {
      return;
    }
    readImage(t.files[0]);
  }

  async function handlePickFile() {
    if (working) {
      return;
    }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/bmp,image/jpeg,image/png,image/webp';
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.length == 1) {
        readImage(fileInput.files[0]);
      }
    });
    fileInput.dispatchEvent(new MouseEvent('click'));
  }

  useEffect(() => {
    if (working) {
      return;
    }
    function handlePaste(e: ClipboardEvent) {
      if (e.clipboardData) {
        handleDataTransfer(e.clipboardData);
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [working]);

  return (
    <>
      <nav className={b.navbar} role='navigation' aria-label='main navigation'>
        <div className={b.navbarBrand}>
          <span className={classes({
            [b.isSize3]: true,
            [b.hasTextWeightBold]: true,
            [b.isFamilyCode]: true,
            [b.ml2]: true,
          })}>1K</span>
        </div>

        <div className={b.navbarMenu}>
          <div className={b.navbarEnd}>
            <div className={b.navbarItem}>
              <a className={b.button} href='https://www.github.com/madidier/1k/' target='_blank'>
                <span className={b.icon}>
                  <img src={ghLogo} />
                </span>
                <span>
                  Code on GitHub
                </span>
              </a>
            </div>
          </div>

        </div>
      </nav>
      <section className={b.section}>
        <div className={b.container}>
          <nav className={b.panel}>
            <p className={b.panelHeading}>
              Image or text input
            </p>
            <div className={b.panelBlock}>
              <p className={b.control}>
                <textarea
                  className={b.textarea}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
              </p>
            </div>
            <div className={b.panelBlock}>
              <p className={b.control}>
                <button
                  className={classes({
                    [b.button]: true,
                    [b.isLink]: !working && dragOver,
                    [b.isLoading]: working,
                  })}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    handleDataTransfer(e.dataTransfer);
                  }}
                  onDragEnter={() => setDragOver(true)}
                  onDragLeave={() => setDragOver(false)}
                  onClick={handlePickFile}
                >
                  Extract text from an image
                </button>
              </p>
            </div>
            <div className={b.panelBlock}>
              <p>
                <span className={b.isItalic}>
                  You may also drop an image onto the button or use Ctrl+V.
                  Your picture will not be uploaded anywhere and the processing
                  will happen in your web browser.
                </span>
                {' '}Supported formats: bmp, jpg, png, pbm, webp.
              </p>
            </div>
          </nav>

          <nav className={b.panel}>
            <p className={b.panelHeading}>
              Decoded output
            </p>
            <div
              className={b.panelBlock}
              style={{ whiteSpace: 'pre-wrap' }}
            >
              <div className={b.content}>
                <p className={classes({
                  [b.hasTextWeightSemibold]: !!decoded,
                  [b.isItalic]: !decoded,
                  [b.hasTextWeightLight]: !decoded,
                })}>
                  {decoded || 'Decoded text goes here (more input is needed)'}
                </p>
                {chunks.length > 0 &&
                  <>
                    <p>The following bits were used to get to this result:</p>
                    <ul>
                      {chunks.map((chunk, index) => <li key={index}>{chunk}</li>)}
                    </ul>
                  </>
                }
              </div>
            </div>
            <div className={b.panelBlock}>
              <div className={b.content}>
                <p>Tips to improve results:</p>
                <ul>
                  <li>
                    Edit the text to remove text and numbers that are not part of the "code".
                  </li>
                  <li>
                    If the "code" contains many spaces, make sure the
                    letters/digits are not isolated by removing some of the
                    spaces.
                  </li>
                  <li>
                    Tesseract may misread a letter here and there, or worse,
                    completely miss one. This can cause a chunk of "code" to
                    be rejected because it results in corrupted text.
                    In such cases, inserting spaces in a big chunk of "code"
                    can help you figure out where something's missing or was
                    misread by tesseract. Other software may be better than
                    tesseract at recognizing screen text.
                  </li>
                  <li>
                    Windows 11 (10 also ?) can recognize text from
                    screenshots. After taking a screenshot, click the
                    notification to open Snipping Tool, then click the
                    "Text actions" icon in the toolbar. You may then either
                    just click on "Copy all text" or select the text to copy
                    from the screenshot. It gives excellent results on
                    screenshots from The Talos Principle 2.
                  </li>
                </ul>
              </div>
            </div>
          </nav>

          <p>
            Built with <a href='https://react.dev/' target='_blank'>React</a>{', '}
            <a href='https://bulma.io/' target='_blank'>Bulma</a>{', '}
            <a href='https://vitejs.dev/' target='_blank'>Vite</a>{', '}
            <a href='https://www.typescriptlang.org/' target='_blank'>TypeScript</a>{' and '}
            <a href='https://github.com/naptha/tesseract.js' target='_blank'>Tesseract.js</a>.
            Hosted on <a href='https://pages.github.com/' target='_blank'>GitHub Pages</a>.
          </p>
        </div>
      </section>
    </>
  );
}

export default App;

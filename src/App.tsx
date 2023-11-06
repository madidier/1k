import b from './bulma.module.scss';
import { classes } from './utils';
import ghLogo from './assets/github-mark.svg';
import { useEffect, useState } from 'react';
import { decodeLenient } from './decode';
import { createWorker } from 'tesseract.js';
import Win11OcrTuto from './Win11OcrTuto';

function App() {
  const [dragOver, setDragOver] = useState(false);
  const [input, setInput] = useState('');
  const { chunks, decoded } = decodeLenient(input);
  const [working, setWorking] = useState(false);
  const [showWin11Tuto, setShowWin11Tuto] = useState(false);

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
          <span className={classes(b.isSize3, b.hasTextWeightBold, b.isFamilyCode, b.ml2)}>
            1K
          </span>
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
                  className={classes(b.button, {
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
              style={{ whiteSpace: 'break-spaces' }}
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
                    <ul style={{ overflowWrap: 'anywhere' }}>
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
                    Remove irrelevant numbers from the input.
                  </li>
                  <li>
                    Tesseract may misread a letter here and there, or worse,
                    completely miss one. This tool will try to detect and work
                    around corrupted bits, but it can't do miracles. If the
                    result is too bad, proof read and fix the code in the
                    transcript. "20" corresponds to spaces, "0a" to line
                    breaks, you may insert some to pinpoint a decoding issue.
                  </li>
                  <li>
                    Any "code" that contains 000 or starts with 00 will be
                    considered irrelevant by this tool. This should never occur
                    in text that is meant to be decoded, but could be present
                    as a result of a text recognition mistake. It is unlikely
                    and has never happened during my playthrough. If it
                    happens anyway, just fix the transcript.
                  </li>
                  <li>
                    <em>Windows 11 users</em>: there's a better way to extract
                    text from screenshots without additional software.{' '}
                    <a role='button' tabIndex={0} onClick={e => {
                      e.preventDefault();
                      setShowWin11Tuto(true);
                    }}>
                      Read this
                    </a>.
                  </li>
                  <li>
                    If you know how to create a tesseract .traineddata file
                    tailored for this use case and want to help improve this
                    tool, please open an issue on GitHub. Ditto if you know
                    of a better OCR library that can run in a web page.
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

      {showWin11Tuto && <Win11OcrTuto onDismiss={() => setShowWin11Tuto(false)} />}
    </>
  );
}

export default App;

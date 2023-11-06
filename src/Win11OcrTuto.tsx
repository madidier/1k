import b from './bulma.module.scss';
import tuto1 from './assets/win11-ocr-1.png';
import tuto2 from './assets/win11-ocr-2.png';
import tuto3 from './assets/win11-ocr-3.png';
import { classes } from './utils';
import { useEffect } from 'react';

interface Win11OcrTutoProps {
  onDismiss(): void;
}

function Win11OcrTuto({ onDismiss }: Win11OcrTutoProps) {
  useEffect(() => {
    document.documentElement.classList.add(b.isClipped);
    document.addEventListener('keydown', onDismiss);
    return () => {
      document.documentElement.classList.remove(b.isClipped);
      document.removeEventListener('keydown', onDismiss);
    };
  }, [onDismiss]);

  return (
    <div className={classes(b.modal, b.isActive)}>
      <div className={b.modalBackground} onClick={onDismiss} />
      <div className={b.modalContent}>
        <div className={b.box}>
          <div className={b.content}>
            <p>
              Windows 11 can read text from screenshots out of the box and it
              is <em>much</em> more reliable than tesseract - it has been
              100% accurate for me so far. The feature's a bit hidden, so
              here are the steps to use it:
            </p>
            <ul>
              <li><img src={tuto1} /></li>
              <li><img src={tuto2} /></li>
              <li><img src={tuto3} /></li>
              <li>
                Then simply paste the text onto the text box in this page.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Win11OcrTuto;

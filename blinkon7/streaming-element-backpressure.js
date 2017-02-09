customElements.define('streaming-element-backpressure',
                      class StreamingElementBackPressure extends HTMLElement {
  constructor() {
    super();

    const iframeReady = new Promise(resolve => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.onload = null;
        resolve(iframe);
      };
      iframe.src = '';
    });

    async function end() {
      let iframe = await iframeReady;
      iframe.contentDocument.write('</streaming-element-inner>');
      iframe.contentDocument.close();
      iframe.remove();
    }

    let idlePromise;
    let charactersWrittenInThisChunk = 0;
    // Magic number that works in one case on one machine.
    const charactersPerChunk = 4096;

    function startNewChunk() {
      idlePromise = new Promise(resolve => {
        window.requestIdleCallback(resolve);
      });
      charactersWrittenInThisChunk = 0;
    }

    this.writable = new WritableStream({
      start: async () => {
        const iframe = await iframeReady;
        iframe.contentDocument.write('<streaming-element-inner>');
        this.appendChild(iframe.contentDocument.querySelector('streaming-element-inner'));
      },
      async write(chunk) {
        if (idlePromise === undefined) {
          startNewChunk();
        }
        let iframe = await iframeReady;
        let cursor = 0;
        while (cursor < chunk.length) {
          const writeCharacters = Math.min(chunk.length - cursor,
                                           charactersPerChunk - charactersWrittenInThisChunk);
          iframe.contentDocument.write(chunk.substr(cursor, writeCharacters));
          cursor += writeCharacters;
          charactersWrittenInThisChunk += writeCharacters;
          if (charactersWrittenInThisChunk === charactersPerChunk) {
            await idlePromise;
            startNewChunk();
          }
        }
      },
      close: end,
      abort: end
    });
  }
});

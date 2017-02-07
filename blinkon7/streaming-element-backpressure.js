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

    this.writable = new WritableStream({
      start: async () => {
        const iframe = await iframeReady;
        iframe.contentDocument.write('<streaming-element-inner>');
        this.appendChild(iframe.contentDocument.querySelector('streaming-element-inner'));
      },
      async write(chunk) {
        let iframe = await iframeReady;
        iframe.contentDocument.write(chunk);
        return new Promise(resolve => {
          window.requestIdleCallback(resolve);
        });
      },
      close: end,
      abort: end
    });
  }
});

// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Polyfill for Stream support for TextEncoder and TextDecoder

(function() {
  'use strict';

  const real = {
    TextEncoder: self.TextEncoder,
    TextDecoder: self.TextDecoder
  };

  class TextEncoder {
    constructor() {
      this._realEncoder = new real.TextEncoder();
      this._transform = undefined;
    }

    encode(input = '') {
      if (this._transform !== undefined) {
        // Do not permit encode() if readable or writable are locked.
        this._transform.readable.getReader().releaseLock();
        this._transform.writable.getWriter().releaseLock();
      }
      return this._realEncoder.encode(input);
    }

    get readable() {
      if (this._transform === undefined) {
        createEncodeTransform(this);
      }
      return this._transform.readable;
    }

    get writable() {
      if (this._transform === undefined) {
        createEncodeTransform(this);
      }
      return this._transform.writable;
    }
  }

  class TextDecoder {
    constructor(label = 'utf-8', options = {}) {
      this._realDecoder = new real.TextDecoder(label, options);
      this._transform = undefined;
    }

    get encoding() {
      return this._realDecoder.encoding;
    }

    get fatal() {
      return this._realDecoder.fatal;
    }

    get ignoreBOM() {
      return this._realDecoder.ignoreBOM;
    }

    decode(input = '', options = {}) {
      if (this._transform !== undefined) {
        // Do not permit encode() if readable or writable are locked.
        this._transform.readable.getReader().releaseLock();
        this._transform.writable.getWriter().releaseLock();
      }
      return this._realDecoder.decode(input, options);
    }

    get readable() {
      if (this._transform === undefined) {
        createDecodeTransform(this);
      }
      return this._transform.readable;
    }

    get writable() {
      if (this._transform === undefined) {
        createDecodeTransform(this);
      }
      return this._transform.writable;
    }
  }

  class TextEncodeTransformer {
    constructor(encoder) {
      this._encoder = encoder;
    }

    transform(chunk, controller) {
      controller.enqueue(this._encoder.encode(chunk));
    }
  }

  function createEncodeTransform(textEncoder) {
    textEncoder._transform = new TransformStream(new TextEncodeTransformer(textEncoder._realEncoder));
  }

  class TextDecodeTransformer {
    constructor(decoder) {
      this._decoder = decoder;
    }

    transform(chunk, controller) {
      controller.enqueue(this._decoder.decode(chunk, {stream: true}));
    }

    flush(controller) {
      // If {fatal: false} in options (the default), then the final call to
      // decode() can produce extra output (usually the unicode replacement
      // character 0xFFFD). When fatal is true, this call is just used for its
      // side-effect of throwing a TypeError exception if the input is incomplete.
      var output = this._decoder.decode();
      if (output !== '') {
        controller.enqueue(output);
      }
      controller.close();
    }
  }

  function createDecodeTransform(textDecoder) {
    textDecoder._transform = new TransformStream(
        new TextDecodeTransformer(textDecoder._realDecoder));
  }

  self['TextEncoder'] = TextEncoder;
  self['TextDecoder'] = TextDecoder;

})();

customElements.define('streaming-element', class StreamingElement extends HTMLElement {
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
      const iframe = await iframeReady;
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
        const iframe = await iframeReady;
        iframe.contentDocument.write(chunk);
      },
      close: end,
      abort: end
    });
  }
});

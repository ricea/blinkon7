function loadOnTrigger(url) {
  let trigger = document.querySelector('#trigger');
  trigger.onclick = async () => {
    trigger.disabled = true;
    trigger.onclick = undefined;
    const streamingElement =
      document.querySelector('#target');
    const response = await fetch(url,
                                 {mode: 'no-cors'});
    
    await response.body
      .pipeThrough(new TextDecoder())
      .pipeTo(streamingElement.writable);
    document.querySelector('#next').style.visibility = 'visible';
  };
}

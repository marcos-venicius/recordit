const $ = (id) => document.getElementById(id);

const MIME_TYPE = 'video/webm;codecs=vp8';
const BITRATE = 1_500_000;

let settings = {};
let stream = null;
let sourceName = '';
let recorder = null;
let chunks = [];
let startTime = 0;
let lastFile = null;

function setStatus(text) {
  $('status').textContent = text;
  $('status').title = text;
}

function updateButtons() {
  const busy = recorder !== null;
  $('record').disabled = busy || !stream || !settings.folder;
  $('pickSource').disabled = busy;
  $('pickFolder').disabled = busy;
}

function releaseSource() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  sourceName = '';
  $('preview').srcObject = null;
  $('preview').hidden = true;
  $('sourceName').textContent = 'Nenhuma fonte selecionada';
  updateButtons();
}

async function selectSource(source) {
  releaseSource();
  $('sources').hidden = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id,
          maxFrameRate: 15,
        },
      },
    });
  } catch (err) {
    setStatus(`Não foi possível capturar a fonte: ${err.message}`);
    return;
  }
  sourceName = source.name;
  $('sourceName').textContent = source.name || 'Fonte selecionada';
  $('preview').srcObject = stream;
  $('preview').hidden = false;
  // Fonte encerrada (ex.: janela fechada): finaliza a gravação ou descarta a seleção
  stream.getVideoTracks()[0].addEventListener('ended', () => (recorder ? stopRecording() : releaseSource()));
  setStatus('');
  updateButtons();
}

function showSources(sources) {
  const grid = $('sources');
  grid.replaceChildren(
    ...sources.map((source) => {
      const button = document.createElement('button');
      const img = document.createElement('img');
      const label = document.createElement('span');
      img.src = source.thumbnail;
      label.textContent = source.name;
      label.title = source.name;
      button.append(img, label);
      button.addEventListener('click', () => selectSource(source));
      return button;
    }),
  );
  grid.hidden = false;
}

function startRecording() {
  chunks = [];
  recorder = new MediaRecorder(stream, { mimeType: MIME_TYPE, videoBitsPerSecond: BITRATE });
  recorder.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data));
  recorder.addEventListener('stop', saveRecording);
  startTime = Date.now();
  recorder.start(1000);
  $('showFile').hidden = true;
  setStatus('Gravando…');
  updateButtons();
  api.setRecording(true);
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
}

async function saveRecording() {
  setStatus('Salvando…');
  const blob = new Blob(chunks, { type: MIME_TYPE });
  chunks = [];
  try {
    lastFile = await api.saveRecording({
      data: await blob.arrayBuffer(),
      ext: 'webm',
      folder: settings.folder,
      name: $('name').value,
      sourceName,
      startTime,
    });
    setStatus(`Salvo em ${lastFile}`);
    $('showFile').hidden = false;
  } catch (err) {
    setStatus(`Erro ao salvar: ${err.message}`);
  } finally {
    recorder = null;
    releaseSource();
  }
}

$('pickFolder').addEventListener('click', async () => {
  const folder = await api.pickFolder(settings.folder);
  if (!folder) return;
  settings.folder = folder;
  $('folder').value = folder;
  updateButtons();
});

$('pickSource').addEventListener('click', async () => {
  const sources = await api.getSources();
  if (!sources.length) return setStatus('Nenhuma fonte selecionada.');
  if (sources.length === 1) return selectSource(sources[0]);
  showSources(sources);
});

$('record').addEventListener('click', startRecording);
$('showFile').addEventListener('click', () => api.showInFolder(lastFile));
api.onStopRequest(stopRecording);

async function init() {
  settings = await api.getSettings();
  $('folder').value = settings.folder;
  updateButtons();
}

init();

const $ = (id) => document.getElementById(id);

const FORMATS = [
  { label: 'MP4 (H.264)', ext: 'mp4', mimeType: 'video/mp4;codecs=avc1' },
  { label: 'WebM (VP8)', ext: 'webm', mimeType: 'video/webm;codecs=vp8' },
].filter((f) => MediaRecorder.isTypeSupported(f.mimeType));
const QUALITIES = [
  { label: 'Low', value: 'low', bitrate: 1_500_000 },
  { label: 'Medium', value: 'medium', bitrate: 4_000_000 },
  { label: 'High', value: 'high', bitrate: 8_000_000 },
];
const DEFAULT_QUALITY = 'medium';

let settings = {};
let stream = null;
let sourceName = '';
let recorder = null;
let chunks = [];
let format = FORMATS[0];
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
  $('format').disabled = busy;
  $('quality').disabled = busy;
}

function releaseSource() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  sourceName = '';
  $('preview').srcObject = null;
  $('preview').hidden = true;
  $('sourceName').textContent = 'No source selected';
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
          maxFrameRate: 30,
        },
      },
    });
  } catch (err) {
    setStatus(`Could not capture source: ${err.message}`);
    return;
  }
  sourceName = source.name;
  $('sourceName').textContent = source.name || 'Selected source';
  $('preview').srcObject = stream;
  $('preview').hidden = false;
  // Source ended (e.g. window closed): finish the recording or drop the selection
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
  format = FORMATS[$('format').selectedIndex];
  const { bitrate } = QUALITIES[$('quality').selectedIndex];
  recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: bitrate });
  recorder.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data));
  recorder.addEventListener('stop', saveRecording);
  startTime = Date.now();
  recorder.start(1000);
  $('showFile').hidden = true;
  setStatus('Recording…');
  updateButtons();
  api.setRecording(true);
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
}

async function saveRecording() {
  setStatus('Saving…');
  let blob = new Blob(chunks, { type: format.mimeType });
  chunks = [];
  // MediaRecorder WebM has no duration (not seekable); write it into the header
  if (format.ext === 'webm') blob = await ysFixWebmDuration(blob, Date.now() - startTime, { logger: false });
  try {
    lastFile = await api.saveRecording({
      data: await blob.arrayBuffer(),
      ext: format.ext,
      folder: settings.folder,
      name: $('name').value,
      sourceName,
      startTime,
    });
    setStatus(`Saved to ${lastFile}`);
    $('showFile').hidden = false;
  } catch (err) {
    setStatus(`Failed to save: ${err.message}`);
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
  if (!sources.length) return setStatus('No source selected.');
  if (sources.length === 1) return selectSource(sources[0]);
  showSources(sources);
});

$('format').addEventListener('change', () => {
  api.saveSettings({ format: FORMATS[$('format').selectedIndex].ext });
});

$('quality').addEventListener('change', () => {
  api.saveSettings({ quality: $('quality').value });
});

$('record').addEventListener('click', startRecording);
$('showFile').addEventListener('click', () => api.showInFolder(lastFile));
api.onStopRequest(stopRecording);

async function init() {
  settings = await api.getSettings();
  $('folder').value = settings.folder;
  $('format').replaceChildren(...FORMATS.map((f) => new Option(f.label, f.ext)));
  if (FORMATS.some((f) => f.ext === settings.format)) $('format').value = settings.format;
  $('quality').replaceChildren(...QUALITIES.map((q) => new Option(q.label, q.value)));
  $('quality').value = QUALITIES.some((q) => q.value === settings.quality) ? settings.quality : DEFAULT_QUALITY;
  updateButtons();
}

init();

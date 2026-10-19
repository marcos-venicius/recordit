const $ = (id) => document.getElementById(id);

let settings = {};
let stream = null;
let sourceName = '';

function setStatus(text) {
  $('status').textContent = text;
}

function releaseSource() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  sourceName = '';
  $('preview').srcObject = null;
  $('preview').hidden = true;
  $('sourceName').textContent = 'Nenhuma fonte selecionada';
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
  stream.getVideoTracks()[0].addEventListener('ended', releaseSource);
  setStatus('');
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

$('pickFolder').addEventListener('click', async () => {
  const folder = await api.pickFolder(settings.folder);
  if (!folder) return;
  settings.folder = folder;
  $('folder').value = folder;
});

$('pickSource').addEventListener('click', async () => {
  const sources = await api.getSources();
  if (!sources.length) return setStatus('Nenhuma fonte selecionada.');
  if (sources.length === 1) return selectSource(sources[0]);
  showSources(sources);
});

async function init() {
  settings = await api.getSettings();
  $('folder').value = settings.folder;
}

init();

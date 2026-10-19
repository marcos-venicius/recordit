const $ = (id) => document.getElementById(id);

let settings = {};

function setStatus(text) {
  $('status').textContent = text;
}

$('pickFolder').addEventListener('click', async () => {
  const folder = await api.pickFolder(settings.folder);
  if (!folder) return;
  settings.folder = folder;
  $('folder').value = folder;
});

async function init() {
  settings = await api.getSettings();
  $('folder').value = settings.folder;
}

init();

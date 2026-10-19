# RecordIt

Gravador de tela minimalista para desktop Linux (sem áudio).

## Uso

1. Escolha a **pasta de destino** e, opcionalmente, o **nome do arquivo**.
2. Escolha o **formato** (WebM ou MP4).
3. Clique em **Escolher janela ou tela…** — no Wayland abre o seletor do sistema.
4. Clique em **Gravar**: a janela some e o ícone na bandeja fica vermelho.
5. Clique no ícone da bandeja (ou em *Parar gravação* no menu) para finalizar e salvar.

Sem nome, o arquivo é salvo como `<app>_<AAAA-MM-DD_HH-mm-ss>.<ext>`.

## Instalação

```sh
npm install
npm run dist
sudo apt install ./dist/recordit_0.1.0_amd64.deb   # ou execute dist/RecordIt-0.1.0.AppImage
```

## Desenvolvimento

```sh
npm start         # executa o app
npm run icons     # regenera os ícones em build/
```

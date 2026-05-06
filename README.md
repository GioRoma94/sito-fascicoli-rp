# Sito Fascicoli Investigativi RP

Base Node/Express pronta per Render. Il sito permette di creare fascicoli, modificarne i dati principali e aggiungere capitoli con narrativa e persone coinvolte.

## Avvio locale

```bash
npm install
npm start
```

Poi apri `http://localhost:3000`.

## Deploy su Render

1. Carica questa cartella in una repository GitHub.
2. Su Render crea un nuovo Web Service collegato alla repository.
3. Usa questi comandi:
   - Build Command: `npm install`
   - Start Command: `npm start`

Il file `render.yaml` contiene gia la configurazione base.

## Nota sui dati

I fascicoli vengono salvati nel browser con `localStorage`. Per un server RP piccolo va bene come base iniziale, ma per dati condivisi tra piu utenti servira aggiungere un database e login.

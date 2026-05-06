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
3. Crea un database PostgreSQL su Render.
4. Nel Web Service aggiungi una variabile ambiente:
   - Key: `DATABASE_URL`
   - Value: l'`Internal Database URL` del database PostgreSQL Render
5. Aggiungi anche le variabili per il login:
   - `AUTH_USER`: username di accesso
   - `AUTH_PASSWORD`: password di accesso
   - `AUTH_SECRET`: una stringa lunga e casuale per firmare la sessione
6. Usa questi comandi:
   - Build Command: `npm install`
   - Start Command: `npm start`

Il file `render.yaml` contiene gia la configurazione base.

## Nota sui dati

I fascicoli vengono salvati in PostgreSQL tramite la variabile `DATABASE_URL`.
All'avvio il server crea automaticamente le tabelle `cases` e `chapters` se non esistono.
Se `DATABASE_URL` non e configurata, il server mostra solo dati demo in memoria per sviluppo locale.

## Utenti e password

Il login usa le variabili ambiente del Web Service Render:

```text
AUTH_USER=admin
AUTH_PASSWORD=metti-una-password-lunga
AUTH_SECRET=metti-una-stringa-casuale-lunga
```

Per cambiare accesso basta modificare `AUTH_USER` e `AUTH_PASSWORD` su Render e fare redeploy.
Questa versione gestisce un solo account. Per piu utenti conviene creare una tabella `users` nel database, salvare password hashate con `bcrypt`, e aggiungere una pagina/admin panel per creare o disattivare utenti.

## Backup database Render

Dal database Render copia l'`External Database URL`, poi esegui:

```bash
pg_dump "EXTERNAL_DATABASE_URL" -Fc -f backup-fascicoli.dump
```

Per ripristinare su un nuovo database:

```bash
pg_restore --clean --if-exists -d "NUOVO_EXTERNAL_DATABASE_URL" backup-fascicoli.dump
```

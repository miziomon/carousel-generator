# Sistema di autenticazione OTP — Specifiche tecniche

> **Superato dalla v1.32.0** (migrazione a `@mavida/hub-auth`, libreria condivisa
> dei progetti hub). Questo documento descriveva l'architettura interna a
> questo progetto (store `useReducer`, `localStorage` diretto, token statico
> `VITE_API_AUTH_TOKEN`), non più accurata: il login OTP, la sessione, la
> guardia sul 401 e la validazione al boot (`GET /me`) sono ora gestiti dalla
> libreria, condivisa con gli altri frontend di hub. Il suo scopo originale
> — poter riusare il sistema OTP in un'altra applicazione — è oggi
> soddisfatto direttamente dalla libreria.
>
> Riferimenti:
> - `github.com/mavidasnc/hub-auth` — README con guida di integrazione
> - `src/auth.js` — configurazione del client in questo progetto
> - `hub/docs/wiki/20-auth-sessions.md` — contratto lato server
>   (`otp-request` / `otp-verify` / `logout` / `GET /me`)

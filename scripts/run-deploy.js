/**
 * Trova Git Bash su Windows e lancia deploy.sh con gli argomenti passati.
 * Necessario perché `npm run` su Windows risolve `bash` con WSL invece di Git Bash.
 *
 * Uso interno — non chiamare direttamente: usare `npm run deploy`.
 */

import { execSync } from 'child_process';
import { accessSync } from 'fs';
import { join } from 'path';

const GIT_BASH_PATHS = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    join( process.env.USERPROFILE ?? '', 'AppData', 'Local', 'Programs', 'Git', 'bin', 'bash.exe' ),
];

const bash = GIT_BASH_PATHS.find( p => {
    try { accessSync( p ); return true; } catch { return false; }
} );

if ( !bash ) {
    console.error( '\n[ERROR] Git Bash non trovato nei percorsi standard.' );
    console.error( '  → Installa Git for Windows: https://git-scm.com/download/win' );
    console.error( '  → Oppure esegui direttamente da Git Bash: ./deploy.sh\n' );
    process.exit( 1 );
}

const args = process.argv.slice( 2 ).join( ' ' );
const cmd  = args ? `"${bash}" deploy.sh ${args}` : `"${bash}" deploy.sh`;

try {
    execSync( cmd, { stdio: 'inherit' } );
} catch ( err ) {
    process.exit( err.status ?? 1 );
}

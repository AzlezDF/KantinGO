import { existsSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const locatedPhp = process.platform === 'win32'
    ? process.env.PATH?.split(delimiter).map((directory) => join(directory, 'php.exe')).find(existsSync)
    : spawnSync('which', ['php'], { encoding: 'utf8' }).stdout?.trim();
const phpPath = locatedPhp;

if (!phpPath) {
    console.error('PHP tidak ditemukan. Pastikan PHP tersedia di PATH.');
    process.exit(1);
}

const extensionDirectory = join(dirname(phpPath), 'ext');
const projectDirectory = process.cwd();
const publicDirectory = join(projectDirectory, 'public');
const serverRouter = join(projectDirectory, 'vendor', 'laravel', 'framework', 'src', 'Illuminate', 'Foundation', 'resources', 'server.php');

if (!existsSync(extensionDirectory) || !existsSync(serverRouter) || !existsSync(join(publicDirectory, 'index.php'))) {
    console.error('Direktori ekstensi PHP, router Laravel, atau public/index.php tidak ditemukan.');
    process.exit(1);
}

const port = process.env.APP_PORT || '8000';
const host = process.env.APP_HOST || '127.0.0.1';
const phpArguments = ['-d', `extension_dir=${extensionDirectory}`];
const phpModules = spawnSync(phpPath, [...phpArguments, '-m'], { encoding: 'utf8' });

if (!phpModules.stdout?.toLowerCase().includes('\nopenssl\n')) {
    phpArguments.push('-d', 'extension=openssl');
}

const server = spawn(phpPath, [...phpArguments, '-S', `${host}:${port}`, serverRouter], {
    cwd: publicDirectory,
    stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.kill(signal));
}

server.on('error', (error) => {
    console.error(`Server Laravel gagal dijalankan: ${error.message}`);
    process.exit(1);
});

server.on('exit', (code) => process.exit(code ?? 0));

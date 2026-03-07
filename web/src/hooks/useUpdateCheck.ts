import { useState, useCallback } from 'react';
import { isTauri, isVSCode } from '../config';

const GITHUB_API = 'https://api.github.com/repos/Mdyuzhev/Uplink/releases/latest';

declare const __APP_VERSION__: string;

export type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error';

export interface UpdateInfo {
    version: string;
    downloadUrl: string;
    releaseNotes: string;
}

export function useUpdateCheck() {
    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

    const checkForUpdates = useCallback(async () => {
        setStatus('checking');
        setUpdateInfo(null);

        try {
            const resp = await fetch(GITHUB_API, {
                headers: { Accept: 'application/vnd.github+json' },
            });

            if (!resp.ok) throw new Error(`GitHub API: ${resp.status}`);

            const release = await resp.json();
            const latestVersion = (release.tag_name as string).replace(/^v/, '');
            const currentVersion = __APP_VERSION__;

            if (!isNewerVersion(latestVersion, currentVersion)) {
                setStatus('up-to-date');
                return;
            }

            const assets: { name: string; browser_download_url: string }[] = release.assets;
            let downloadUrl: string = release.html_url;

            if (isVSCode) {
                downloadUrl = findVsixAsset(assets) ?? release.html_url;
            } else if (isTauri) {
                try {
                    // Dynamic import — пакет доступен только в Tauri runtime
                    // eslint-disable-next-line @typescript-eslint/no-implied-eval
                    const modName = '@tauri-apps/plugin-os';
                    const mod = await (new Function('m', 'return import(m)') as (m: string) => Promise<{ platform: () => Promise<string> }>)(modName);
                    const os: string = await mod.platform();
                    downloadUrl = findAssetForPlatform(assets, os) ?? release.html_url;
                } catch {
                    downloadUrl = release.html_url;
                }
            }

            setUpdateInfo({
                version: latestVersion,
                downloadUrl,
                releaseNotes: release.body || '',
            });
            setStatus('available');
        } catch (err) {
            console.error('Ошибка проверки обновлений:', err);
            setStatus('error');
        }
    }, []);

    return { status, updateInfo, checkForUpdates };
}

function isNewerVersion(latest: string, current: string): boolean {
    const parse = (v: string) => v.split('.').map(Number);
    const [la, lb, lc] = parse(latest);
    const [ca, cb, cc] = parse(current);
    if (la !== ca) return la > ca;
    if (lb !== cb) return lb > cb;
    return lc > cc;
}

function findAssetForPlatform(
    assets: { name: string; browser_download_url: string }[],
    os: string,
): string | null {
    if (os === 'windows') {
        return assets.find((a) => a.name.endsWith('-setup.exe'))?.browser_download_url ?? null;
    }
    if (os === 'macos') {
        return assets.find((a) => a.name.endsWith('.dmg'))?.browser_download_url ?? null;
    }
    if (os === 'linux') {
        return (
            assets.find((a) => a.name.endsWith('.deb'))?.browser_download_url ??
            assets.find((a) => a.name.endsWith('.AppImage'))?.browser_download_url ??
            null
        );
    }
    return null;
}

function findVsixAsset(assets: { name: string; browser_download_url: string }[]): string | null {
    return assets.find((a) => a.name.endsWith('.vsix'))?.browser_download_url ?? null;
}

/**
 * Проверка и установка обновлений через Tauri Updater.
 * Вызывается при запуске приложения (один раз).
 * Показывает диалог если есть новая версия.
 */

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface UpdateInfo {
    version: string;
    notes: string;
}

/** Проверить обновления. Если есть — dispatch event для UI */
export async function checkForUpdates(): Promise<void> {
    if (!isTauri) return;

    try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();

        if (update) {
            // Отправить событие в React для показа модалки
            window.dispatchEvent(new CustomEvent('uplink:update-available', {
                detail: {
                    version: update.version,
                    notes: update.body || 'Доступна новая версия Uplink',
                } satisfies UpdateInfo,
            }));

            // Ожидаем ответ от UI
            const accepted = await waitForUserResponse();

            if (accepted) {
                // Dispatch прогресс-событие
                window.dispatchEvent(new CustomEvent('uplink:update-progress', {
                    detail: { status: 'downloading' },
                }));

                let downloaded = 0;
                await update.downloadAndInstall((event) => {
                    if (event.event === 'Started') {
                        window.dispatchEvent(new CustomEvent('uplink:update-progress', {
                            detail: { status: 'downloading', total: event.data.contentLength },
                        }));
                    } else if (event.event === 'Progress') {
                        downloaded += event.data.chunkLength;
                        window.dispatchEvent(new CustomEvent('uplink:update-progress', {
                            detail: { status: 'downloading', downloaded },
                        }));
                    } else if (event.event === 'Finished') {
                        window.dispatchEvent(new CustomEvent('uplink:update-progress', {
                            detail: { status: 'installing' },
                        }));
                    }
                });

                // Перезапуск
                const { relaunch } = await import('@tauri-apps/plugin-process');
                await relaunch();
            }
        }
    } catch (err) {
        console.warn('Ошибка проверки обновлений:', err);
    }
}

function waitForUserResponse(): Promise<boolean> {
    return new Promise(resolve => {
        const handler = (e: Event) => {
            const accepted = (e as CustomEvent).detail?.accepted;
            window.removeEventListener('uplink:update-response', handler);
            resolve(!!accepted);
        };
        window.addEventListener('uplink:update-response', handler);

        // Таймаут 60 сек — пропускаем если нет ответа
        setTimeout(() => {
            window.removeEventListener('uplink:update-response', handler);
            resolve(false);
        }, 60000);
    });
}

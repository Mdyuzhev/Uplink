/**
 * Звуки звонков через Web Audio API.
 * Не требует внешних аудиофайлов.
 */

let audioCtx: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

/** Исходящий: тональный гудок (400Hz, 1s on / 3s off) */
export function startDialingTone(): void {
    stopAllSounds();
    const ctx = getAudioContext();
    const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 400;
        gain.gain.value = 0.15;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1);
    };
    playBeep();
    ringtoneInterval = setInterval(playBeep, 4000);
}

/** Входящий: двойной звонок (440+480Hz, 2s on / 4s off) */
export function startRingtone(): void {
    stopAllSounds();
    const ctx = getAudioContext();
    const playRing = () => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.value = 0.12;
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 2);
        osc2.stop(ctx.currentTime + 2);
    };
    playRing();
    ringtoneInterval = setInterval(playRing, 5000);
}

/** Остановить все звуки */
export function stopAllSounds(): void {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }
}

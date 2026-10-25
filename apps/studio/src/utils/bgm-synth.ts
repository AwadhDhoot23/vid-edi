// Procedural Web Audio Synthesizer with 3 distinct musical signatures
// 100% offline, zero-CORS, reliable preview and timeline playback

export type BgmPresetId = 'bgm_lofi_chill' | 'bgm_synthwave_energy' | 'bgm_ambient_tech' | 'bgm_upbeat_vlog' | string;

export class WebAudioBgmSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isRunning = false;
  private loopInterval: number | null = null;
  private currentPreset: string = '';

  private getAudioContext(): AudioContext | null {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    this.ctx = new AudioCtx();
    return this.ctx;
  }

  start(presetId: BgmPresetId, baseVol = 0.8, ducked = false) {
    if (this.isRunning && this.currentPreset === presetId) {
      this.updateVolume(baseVol, ducked);
      return;
    }

    this.stop();

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      this.masterGain = ctx.createGain();
      const clampedVol = Math.min(1.0, Math.max(0, baseVol));
      const targetGain = clampedVol * (ducked ? 0.2 : 0.8) * 0.14;
      this.masterGain.gain.setValueAtTime(Math.max(0.001, targetGain), ctx.currentTime);
      this.masterGain.connect(ctx.destination);
      this.isRunning = true;
      this.currentPreset = presetId;

      if (presetId.includes('synthwave') || presetId.includes('upbeat')) {
        this.startSynthwaveBeat();
      } else if (presetId.includes('ambient')) {
        this.startAmbientSoundscape();
      } else {
        // Default: Lofi Coffee Beat
        this.startLofiChillBeat();
      }
    } catch (e) {
      console.warn('WebAudioBgmSynth start error:', e);
    }
  }

  updateVolume(baseVol: number, ducked: boolean) {
    if (!this.ctx || !this.masterGain || !this.isRunning) return;
    const clampedVol = Math.min(1.0, Math.max(0, baseVol));
    const targetGain = clampedVol * (ducked ? 0.2 : 0.8) * 0.14;
    this.masterGain.gain.setTargetAtTime(Math.max(0.0001, targetGain), this.ctx.currentTime, 0.08);
  }

  stop() {
    this.isRunning = false;
    this.currentPreset = '';
    if (this.loopInterval !== null) {
      window.clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {}
      this.ctx = null;
      this.masterGain = null;
    }
  }

  isPlaying(): boolean {
    return this.isRunning;
  }

  getCurrentPreset(): string {
    return this.currentPreset;
  }

  // 1. LO-FI CHILL (Warm Rhodes jazz chords, soft kick, vinyl crackle, 80 BPM)
  private startLofiChillBeat() {
    const lofiChords = [
      // Ebmaj7
      [155.56, 196.0, 233.08, 293.66],
      // Cm7
      [130.81, 155.56, 196.0, 233.08],
      // Fm7
      [174.61, 207.65, 261.63, 311.13],
      // Bb7
      [116.54, 146.83, 174.61, 207.65],
    ];

    let chordIdx = 0;
    const playLofiStep = () => {
      if (!this.isRunning || !this.masterGain || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = lofiChords[chordIdx % lofiChords.length]!;
      chordIdx++;

      // Rhodes Chords (sine + triangle)
      freqs.forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(620, now);
        filter.Q.setValueAtTime(1.2, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 2.1);
      });

      // Soft Sub-bass Kick
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(110, now);
      kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.18);

      kickGain.gain.setValueAtTime(0.2, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.4);
    };

    playLofiStep();
    this.loopInterval = window.setInterval(playLofiStep, 2250);
  }

  // 2. SYNTHWAVE ENERGY (Punchy detuned dual saw bassline, 120 BPM, resonant filter sweep)
  private startSynthwaveBeat() {
    const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]; // A - A - C - D - A - A - E - D
    let step = 0;

    const playSynthwaveStep = () => {
      if (!this.isRunning || !this.masterGain || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freq = bassNotes[step % bassNotes.length]!;
      step++;

      // Dual Saw Bass
      [-3, 3].forEach((detuneCent) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq / 2, now); // 55Hz register
        osc.detune.setValueAtTime(detuneCent, now);

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(4.0, now);
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(250, now + 0.22);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.25);
      });

      // Snare on backbeats (every 4th step = beat 2 and 4)
      if (step % 4 === 2) {
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1200, now);

        const snareGain = this.ctx.createGain();
        snareGain.gain.setValueAtTime(0.15, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(snareGain);
        snareGain.connect(this.masterGain);

        whiteNoise.start(now);
        whiteNoise.stop(now + 0.13);
      }
    };

    playSynthwaveStep();
    this.loopInterval = window.setInterval(playSynthwaveStep, 250); // 120 BPM 16th notes
  }

  // 3. AMBIENT TECH (Crystalline kalimba/bell chimes, high pentatonic overtones, 72 BPM)
  private startAmbientSoundscape() {
    const bellNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51]; // C5, E5, G5, B5, D6, E6
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 392.0],  // Gadd9
    ];

    let chordIdx = 0;
    const playAmbientStep = () => {
      if (!this.isRunning || !this.masterGain || !this.ctx) return;
      const now = this.ctx.currentTime;
      const padFreqs = chords[chordIdx % chords.length]!;
      chordIdx++;

      // Ethereal Sine Pad
      padFreqs.forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 3.3);
      });

      // Crystalline Bell Plucks (2 notes per cycle)
      [0, 1].forEach((pluckIdx) => {
        const pluckTime = now + pluckIdx * 0.65;
        const noteFreq = bellNotes[(chordIdx * 2 + pluckIdx) % bellNotes.length]!;

        if (!this.ctx || !this.masterGain) return;
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();

        bellOsc.type = 'triangle';
        bellOsc.frequency.setValueAtTime(noteFreq, pluckTime);

        bellGain.gain.setValueAtTime(0.001, pluckTime);
        bellGain.gain.exponentialRampToValueAtTime(0.08, pluckTime + 0.02);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, pluckTime + 1.8);

        bellOsc.connect(bellGain);
        bellGain.connect(this.masterGain);
        bellOsc.start(pluckTime);
        bellOsc.stop(pluckTime + 1.9);
      });
    };

    playAmbientStep();
    this.loopInterval = window.setInterval(playAmbientStep, 3200);
  }
}

export const bgmSynth = new WebAudioBgmSynth();

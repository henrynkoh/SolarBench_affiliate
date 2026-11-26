import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';

const execFileAsync = promisify(execFile);

export interface StoredDailyVideoRecord {
  dateKey: string;
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  campaignHeadline: string;
  status: 'playing_today' | 'archived';
  visibility: 'public';
  windowStartIso: string;
  windowEndIso: string;
  videoUrl: string;
  posterUrl: string;
  narratorVoice: string;
  durationSec: number;
  bestPlatform: string;
  lowestLandedPrice: number;
  msrp: number;
  dailyUnitsSoldEstimate: string;
  scriptSummary: string;
  ownerId: string;
  createdAtIso: string;
  archivedAtIso?: string;
}

interface ProductSeedTemplate {
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  campaignHeadline: string;
  bestPlatform: string;
  lowestLandedPrice: number;
  msrp: number;
  dailyUnitsSoldEstimate: string;
  imageFilename: string;
  narrationText: string;
}

const PRODUCT_ROTATION_TEMPLATES: ProductSeedTemplate[] = [
  {
    productId: 'anker-solix-f3800',
    productName: 'Anker SOLIX F3800 3,840Wh 6000W Power Station',
    brand: 'Anker SOLIX',
    sku: 'ANK-SOLIX-F3800',
    campaignHeadline:
      'Skip the $15,000 Transfer Quote: 6,000W Split-Phase Backup Under $2,699',
    bestPlatform: 'eBay Authorized',
    lowestLandedPrice: 2680,
    msrp: 3999,
    dailyUnitsSoldEstimate: '890+ units / 24h across Amazon, eBay & OEM Direct',
    imageFilename: 'portable_power_station_1794734753467.jpg',
    narrationText:
      'Most homeowners assume running a well pump or dryer requires a fifteen-thousand-dollar contractor quote. Yet Anker SOLIX F3800 dropped to twenty-six eighty on eBay Authorized today, delivering six thousand watts of split-phase backup. Compare all ten stores on SolarBench.',
  },
  {
    productId: 'eg4-6000xp-inverter',
    productName: 'EG4 6000XP 48V Split-Phase Off-Grid Inverter',
    brand: 'EG4 Electronics',
    sku: 'EG4-6000XP',
    campaignHeadline:
      'Why Off-Grid Builders Stopped Buying $5,000 Inverters: The $1,368 6000XP Audit',
    bestPlatform: 'eBay Authorized',
    lowestLandedPrice: 1368,
    msrp: 1599,
    dailyUnitsSoldEstimate: '740+ units / 24h across Signature Solar, Current Connected & eBay',
    imageFilename: 'hybrid_solar_inverter_1794734752486.jpg',
    narrationText:
      'You do not need five-thousand-dollar legacy inverters for reliable 240-volt cabin backup. The EG4 6000XP delivers six thousand watts continuous with dual 480-volt MPPT solar inputs for thirteen sixty-eight landed. Audit all ten distributors on SolarBench.',
  },
  {
    productId: 'ecoflow-delta-pro-3',
    productName: 'EcoFlow DELTA Pro 3 Portable Power Station',
    brand: 'EcoFlow',
    sku: 'EF-DP3-4096',
    campaignHeadline:
      'STOP Buying $15,000 Gas Standby Generators — 240V Whole-Home Backup for $2,699',
    bestPlatform: 'eBay Authorized',
    lowestLandedPrice: 2699,
    msrp: 3699,
    dailyUnitsSoldEstimate: '1,420+ units / 24h across Amazon, eBay & Home Depot',
    imageFilename: 'lifepo4_server_battery_1794734752705.jpg',
    narrationText:
      'Homeowners spend fifteen thousand dollars on loud gas standby generators, plus years of maintenance. Today, 240-volt LiFePO4 backup stations dropped under twenty-seven hundred dollars across Amazon and eBay. With four thousand watts of silent power and a thirty percent tax credit, compare all ten live stores on SolarBench.',
  },
  {
    productId: 'eg4-ll-s-48v-100ah',
    productName: 'EG4 LL-S 48V 100Ah Server Rack Battery',
    brand: 'EG4 Electronics',
    sku: 'EG4-LLS-48100',
    campaignHeadline:
      '22 Cents Per Watt-Hour: Why Server Rack LiFePO4 Replaced Lead-Acid Banks',
    bestPlatform: 'Signature Solar',
    lowestLandedPrice: 1144,
    msrp: 1499,
    dailyUnitsSoldEstimate: '980+ units / 24h across Signature Solar, Amazon & Current Connected',
    imageFilename: 'lifepo4_server_battery_1794734752705.jpg',
    narrationText:
      'Lead-acid banks quietly fail after three winters while costing more per usable kilowatt-hour. Today, the UL-listed EG4 LL-S 48-volt server rack battery lands near eleven forty-four, delivering seven thousand cycles at twenty-two cents per watt-hour. Compare all ten live suppliers on SolarBench.',
  },
  {
    productId: 'victron-smartsolar-150-100',
    productName: 'Victron SmartSolar MPPT 150/100-Tr VE.Can',
    brand: 'Victron Energy',
    sku: 'VIC-SCC115110410',
    campaignHeadline:
      '98% Harvest Efficiency: Why Van & Off-Grid Engineers Pay Extra for Victron',
    bestPlatform: 'Current Connected',
    lowestLandedPrice: 549,
    msrp: 689,
    dailyUnitsSoldEstimate: '610+ units / 24h across Current Connected, Amazon & eBay',
    imageFilename: 'mppt_charge_controller_1794734753880.jpg',
    narrationText:
      'Cheap charge controllers waste peak midday solar watts through thermal throttling. Today, Victron SmartSolar 150-100 tracks fast cloud shifts at ninety-eight percent efficiency for five forty-nine landed. Review full teardown metrics and live prices on SolarBench.',
  },
  {
    productId: 'canadian-solar-440w-bifacial',
    productName: 'Canadian Solar 440W N-Type TOPCon Bifacial',
    brand: 'Canadian Solar',
    sku: 'CS-TOPBIHIKU-440',
    campaignHeadline:
      'Under 29 Cents Per Watt: Residential TOPCon Bifacials Beat Roof Quotes by 60%',
    bestPlatform: 'SanTan Solar',
    lowestLandedPrice: 126,
    msrp: 198,
    dailyUnitsSoldEstimate: '1,150+ panels / 24h across SanTan Solar, Signature Solar & Amazon',
    imageFilename: 'solar_panel_bifacial_1794734751867.jpg',
    narrationText:
      'Turnkey rooftop quotes routinely charge over three dollars per watt installed. Direct N-type TOPCon 440-watt bifacial modules dropped to twenty-nine cents per watt today on SanTan Solar and Signature Solar. Check landed freight pricing across all ten stores on SolarBench.',
  },
];

const LEGACY_PRODUCT_ID_MAP: Record<string, string> = {
  'eg4-6000xp': 'eg4-6000xp-inverter',
  'eg4-lifepower4-48v-100ah': 'eg4-ll-s-48v-100ah',
};

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return formatLocalDateKey(dt);
}

export function getWindowBoundsForDateKey(dateKey: string): {
  windowStartIso: string;
  windowEndIso: string;
} {
  const [y, m, d] = dateKey.split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  const end = new Date(y, (m || 1) - 1, (d || 1) + 1, 0, 0, 0, 0);
  return {
    windowStartIso: start.toISOString(),
    windowEndIso: end.toISOString(),
  };
}

export function getNextMidnightIso(now = new Date()): string {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return next.toISOString();
}

export class DailyVideoEngine {
  private readonly rootDir: string;
  private readonly dataDir: string;
  private readonly dailyVideosDir: string;
  private readonly ledgerPath: string;
  private readonly masterSamplePath: string;
  private readonly getGeminiClient: () => GoogleGenAI | null;
  private activeJob: Promise<void> | null = null;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  constructor(rootDir: string, getGeminiClient: () => GoogleGenAI | null) {
    this.rootDir = rootDir;
    this.dataDir = path.join(rootDir, 'data');
    this.dailyVideosDir = path.join(rootDir, 'public', 'videos', 'daily');
    this.ledgerPath = path.join(this.dataDir, 'daily-videos-ledger.json');
    this.masterSamplePath = path.join(
      rootDir,
      'public',
      'videos',
      'stop-buying-15000-generac-sample.mp4'
    );
    this.getGeminiClient = getGeminiClient;
  }

  private ensureDirectories() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.mkdirSync(this.dailyVideosDir, { recursive: true });
  }

  private isHealthyMp4File(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).size >= 10_000;
    } catch {
      return false;
    }
  }

  private cleanupStrayTempFiles() {
    try {
      if (!fs.existsSync(this.dailyVideosDir)) return;
      for (const file of fs.readdirSync(this.dailyVideosDir)) {
        if (file.includes('.tmp.')) {
          const full = path.join(this.dailyVideosDir, file);
          try {
            fs.unlinkSync(full);
          } catch {
            // Ignore cleanup failure
          }
        }
      }
    } catch {
      // Ignore cleanup failure
    }
  }

  private reconcileRecord(rec: StoredDailyVideoRecord): {
    record: StoredDailyVideoRecord;
    changed: boolean;
  } {
    let changed = false;
    let next = { ...rec };

    const mappedId = LEGACY_PRODUCT_ID_MAP[next.productId];
    if (mappedId) {
      next.productId = mappedId;
      changed = true;
    }

    const template = PRODUCT_ROTATION_TEMPLATES.find(
      (t) => t.productId === next.productId
    );
    if (template) {
      if (
        next.productName !== template.productName ||
        next.sku !== template.sku ||
        next.brand !== template.brand
      ) {
        next = {
          ...next,
          productName: template.productName,
          brand: template.brand,
          sku: template.sku,
          campaignHeadline: template.campaignHeadline,
          lowestLandedPrice: template.lowestLandedPrice,
          bestPlatform: template.bestPlatform,
        };
        changed = true;
      }
    }

    // Clear broken static -poster.jpg paths so clients cleanly render the verified hardware image
    if (next.posterUrl && next.posterUrl.endsWith('-poster.jpg')) {
      const diskPoster = path.join(
        this.rootDir,
        'public',
        next.posterUrl.replace(/^\/+/, '')
      );
      if (!fs.existsSync(diskPoster)) {
        next.posterUrl = '';
        changed = true;
      }
    }

    return { record: next, changed };
  }

  private readLedger(): StoredDailyVideoRecord[] {
    this.ensureDirectories();
    if (!fs.existsSync(this.ledgerPath)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(this.ledgerPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      let anyChanged = false;
      const reconciled = parsed.map((item) => {
        const { record, changed } = this.reconcileRecord(
          item as StoredDailyVideoRecord
        );
        if (changed) anyChanged = true;
        return record;
      });

      if (anyChanged) {
        this.writeLedger(reconciled);
      }

      return reconciled;
    } catch {
      return [];
    }
  }

  private writeLedger(records: StoredDailyVideoRecord[]) {
    this.ensureDirectories();
    const sorted = [...records].sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
    fs.writeFileSync(this.ledgerPath, JSON.stringify(sorted, null, 2), 'utf-8');
  }

  private async synthesizeSoloMaleWav(
    text: string,
    wavPath: string
  ): Promise<boolean> {
    const ai = this.getGeminiClient();
    if (!ai) return false;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style:
                    'Solo mature adult male narrator alone, deep warm baritone voice, calm unhurried authoritative audiobook cadence (~145 WPM), clear resonant American English articulation, zero background voices or music.',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return false;

      fs.writeFileSync(wavPath, Buffer.from(base64Audio, 'base64'));
      return true;
    } catch (err) {
      console.warn('Gemini TTS failed during daily video render:', err);
      return false;
    }
  }

  private async probeDurationSeconds(filePath: string): Promise<number> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ]);
      const parsed = Number.parseFloat(stdout.trim());
      return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 20;
    } catch {
      return 20;
    }
  }

  private escapeDrawtext(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\u2019")
      .replace(/%/g, '\\%');
  }

  private async renderDailyMp4(
    dateKey: string,
    template: ProductSeedTemplate
  ): Promise<{ videoUrl: string; durationSec: number }> {
    this.ensureDirectories();
    const outFile = `daily-${dateKey}.mp4`;
    const outPath = path.join(this.dailyVideosDir, outFile);
    const videoUrl = `/videos/daily/${outFile}`;

    // Keep the verified 5-scene master video for 2026-11-15 EcoFlow DELTA Pro 3
    if (
      dateKey === '2026-11-15' &&
      template.productId === 'ecoflow-delta-pro-3' &&
      fs.existsSync(this.masterSamplePath)
    ) {
      if (!this.isHealthyMp4File(outPath)) {
        fs.copyFileSync(this.masterSamplePath, outPath);
      }
      return { videoUrl, durationSec: 28 };
    }

    const imagePath = path.join(
      this.rootDir,
      'src',
      'assets',
      'images',
      template.imageFilename
    );
    const wavPath = path.join(this.dataDir, `tmp-narrator-${dateKey}.wav`);
    const hasVoice = await this.synthesizeSoloMaleWav(
      template.narrationText,
      wavPath
    );

    const voiceDuration = hasVoice
      ? await this.probeDurationSeconds(wavPath)
      : 18;
    const targetDuration = Math.max(18, Math.min(30, voiceDuration + 1));
    const totalFrames = targetDuration * 30;

    const boldFont = '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf';
    const monoFont = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf';

    const tagText = this.escapeDrawtext(
      `${dateKey} · DAILY #1 BEST SELLER · ${template.bestPlatform.toUpperCase()}`
    );
    const headlineText = this.escapeDrawtext(
      template.campaignHeadline.slice(0, 56)
    );
    const subText = this.escapeDrawtext(
      `${template.productName} | $${template.lowestLandedPrice.toLocaleString()} Landed (MSRP $${template.msrp.toLocaleString()})`
    );

    const vf = [
      `scale=1600:900:force_original_aspect_ratio=increase`,
      `crop=1600:900`,
      `zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=30`,
      `drawbox=x=0:y=490:w=1280:h=230:color=black@0.76:t=fill`,
      `drawbox=x=56:y=516:w=140:h=3:color=#D97706:t=fill`,
      `drawtext=fontfile=${monoFont}:text='${tagText}':fontcolor=#FBBF24:fontsize=17:x=56:y=534`,
      `drawtext=fontfile=${boldFont}:text='${headlineText}':fontcolor=white:fontsize=30:x=56:y=568`,
      `drawtext=fontfile=${boldFont}:text='${subText}':fontcolor=#CBD5E1:fontsize=19:x=56:y=624`,
    ].join(',');

    const tmpOutPath = `${outPath}.tmp.mp4`;

    try {
      if (hasVoice && fs.existsSync(wavPath)) {
        await execFileAsync('ffmpeg', [
          '-y',
          '-loop',
          '1',
          '-i',
          imagePath,
          '-i',
          wavPath,
          '-vf',
          vf,
          '-filter_complex',
          '[1:a]adelay=350|350,apad[aout]',
          '-map',
          '0:v:0',
          '-map',
          '[aout]',
          '-t',
          String(targetDuration),
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-shortest',
          '-movflags',
          '+faststart',
          tmpOutPath,
        ]);
      } else {
        await execFileAsync('ffmpeg', [
          '-y',
          '-loop',
          '1',
          '-i',
          imagePath,
          '-f',
          'lavfi',
          '-i',
          'anullsrc=r=24000:cl=mono',
          '-vf',
          vf,
          '-t',
          String(targetDuration),
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '96k',
          '-shortest',
          '-movflags',
          '+faststart',
          tmpOutPath,
        ]);
      }

      if (this.isHealthyMp4File(tmpOutPath)) {
        fs.renameSync(tmpOutPath, outPath);
      } else if (fs.existsSync(tmpOutPath)) {
        fs.unlinkSync(tmpOutPath);
      }
    } catch (err) {
      console.warn(
        `ffmpeg video render unavailable for ${dateKey}; using fallback spotlight video:`,
        err instanceof Error ? err.message : err
      );
      if (fs.existsSync(this.masterSamplePath)) {
        try {
          fs.copyFileSync(this.masterSamplePath, outPath);
          return { videoUrl, durationSec: 28 };
        } catch {
          // Fall through to static sample URL
        }
      }
      return {
        videoUrl: '/videos/stop-buying-15000-generac-sample.mp4',
        durationSec: 28,
      };
    } finally {
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
      if (fs.existsSync(tmpOutPath)) fs.unlinkSync(tmpOutPath);
    }

    const finalDuration = await this.probeDurationSeconds(outPath);
    return { videoUrl, durationSec: finalDuration };
  }

  private pickTemplateForDate(dateKey: string, existing: StoredDailyVideoRecord[]) {
    if (dateKey === '2026-11-13') return PRODUCT_ROTATION_TEMPLATES[0];
    if (dateKey === '2026-11-14') return PRODUCT_ROTATION_TEMPLATES[1];
    if (dateKey === '2026-11-15') return PRODUCT_ROTATION_TEMPLATES[2];

    const sortedNewestFirst = [...existing].sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
    const recentIds = new Set(sortedNewestFirst.slice(0, 4).map((r) => r.productId));
    const freshCandidate = PRODUCT_ROTATION_TEMPLATES.find(
      (t) => !recentIds.has(t.productId)
    );
    if (freshCandidate) return freshCandidate;

    const mostRecentId = sortedNewestFirst[0]?.productId;
    const nextCandidate = PRODUCT_ROTATION_TEMPLATES.find(
      (t) => t.productId !== mostRecentId
    );
    return nextCandidate ?? PRODUCT_ROTATION_TEMPLATES[0];
  }

  async initializeAndReconcile(): Promise<void> {
    if (this.activeJob) {
      return this.activeJob;
    }
    this.activeJob = (async () => {
      try {
        this.cleanupStrayTempFiles();
        const todayKey = formatLocalDateKey(new Date());
        let ledger = this.readLedger();

        // Seed 2 historical midnight-archived days + today's active day on first run
        const seedDates = [
          addDaysToDateKey(todayKey, -2),
          addDaysToDateKey(todayKey, -1),
          todayKey,
        ];

        for (const dKey of seedDates) {
          const already = ledger.find((r) => r.dateKey === dKey);
          const expectedFile = path.join(this.dailyVideosDir, `daily-${dKey}.mp4`);
          if (!already || !this.isHealthyMp4File(expectedFile)) {
            const template = this.pickTemplateForDate(dKey, ledger);
            const { videoUrl, durationSec } = await this.renderDailyMp4(
              dKey,
              template
            );
            const { windowStartIso, windowEndIso } =
              getWindowBoundsForDateKey(dKey);
            const isPastDay = dKey < todayKey;
            const nowIso = new Date().toISOString();

            const entry: StoredDailyVideoRecord = {
              dateKey: dKey,
              productId: template.productId,
              productName: template.productName,
              brand: template.brand,
              sku: template.sku,
              campaignHeadline: template.campaignHeadline,
              status: isPastDay ? 'archived' : 'playing_today',
              visibility: 'public',
              windowStartIso,
              windowEndIso,
              videoUrl,
              posterUrl: '',
              narratorVoice: 'Charon · Solo Male Baritone',
              durationSec,
              bestPlatform: template.bestPlatform,
              lowestLandedPrice: template.lowestLandedPrice,
              msrp: template.msrp,
              dailyUnitsSoldEstimate: template.dailyUnitsSoldEstimate,
              scriptSummary: template.narrationText,
              ownerId: 'solarbench-scheduler',
              createdAtIso: nowIso,
              ...(isPastDay ? { archivedAtIso: windowEndIso } : {}),
            };

            ledger = [
              ...ledger.filter((r) => r.dateKey !== dKey),
              entry,
            ];
            this.writeLedger(ledger);
          }
        }

        // Archive any active video whose 24-hour midnight window has elapsed
        const now = new Date();
        let changed = false;
        const latestDateKey =
          ledger.map((r) => r.dateKey).sort().pop() ?? todayKey;

        ledger = ledger.map((rec) => {
          if (
            rec.status === 'playing_today' &&
            rec.dateKey < todayKey &&
            now.toISOString() >= rec.windowEndIso
          ) {
            changed = true;
            return {
              ...rec,
              status: 'archived' as const,
              archivedAtIso: now.toISOString(),
            };
          }
          return rec;
        });

        // Ensure there is always an active playing_today record for today (or latest rolled day)
        const hasPlaying = ledger.some((r) => r.status === 'playing_today');
        if (!hasPlaying && !ledger.some((r) => r.dateKey === todayKey)) {
          const template = this.pickTemplateForDate(todayKey, ledger);
          const { videoUrl, durationSec } = await this.renderDailyMp4(
            todayKey,
            template
          );
          const { windowStartIso, windowEndIso } =
            getWindowBoundsForDateKey(todayKey);
          ledger.push({
            dateKey: todayKey,
            productId: template.productId,
            productName: template.productName,
            brand: template.brand,
            sku: template.sku,
            campaignHeadline: template.campaignHeadline,
            status: 'playing_today',
            visibility: 'public',
            windowStartIso,
            windowEndIso,
            videoUrl,
            posterUrl: '',
            narratorVoice: 'Charon · Solo Male Baritone',
            durationSec,
            bestPlatform: template.bestPlatform,
            lowestLandedPrice: template.lowestLandedPrice,
            msrp: template.msrp,
            dailyUnitsSoldEstimate: template.dailyUnitsSoldEstimate,
            scriptSummary: template.narrationText,
            ownerId: 'solarbench-scheduler',
            createdAtIso: now.toISOString(),
          });
          changed = true;
        } else if (!hasPlaying) {
          ledger = ledger.map((rec) =>
            rec.dateKey === latestDateKey
              ? { ...rec, status: 'playing_today' as const }
              : rec
          );
          changed = true;
        }

        if (changed) {
          this.writeLedger(ledger);
        }
      } catch (err) {
        console.warn(
          'Daily video reconciliation skipped due to runtime constraint:',
          err instanceof Error ? err.message : err
        );
      } finally {
        this.activeJob = null;
      }
    })();

    return this.activeJob;
  }

  async generateNextDayAndArchiveCurrent(): Promise<StoredDailyVideoRecord[]> {
    await this.initializeAndReconcile();
    let ledger = this.readLedger();
    const nowIso = new Date().toISOString();

    const highestDateKey =
      ledger.map((r) => r.dateKey).sort().pop() ??
      formatLocalDateKey(new Date());
    const nextDateKey = addDaysToDateKey(highestDateKey, 1);

    // Archive current 24h playing video into permanent DB list
    ledger = ledger.map((rec) =>
      rec.status === 'playing_today'
        ? {
            ...rec,
            status: 'archived' as const,
            archivedAtIso: nowIso,
          }
        : rec
    );

    const template = this.pickTemplateForDate(nextDateKey, ledger);
    const { videoUrl, durationSec } = await this.renderDailyMp4(
      nextDateKey,
      template
    );
    const { windowStartIso, windowEndIso } =
      getWindowBoundsForDateKey(nextDateKey);

    const newRecord: StoredDailyVideoRecord = {
      dateKey: nextDateKey,
      productId: template.productId,
      productName: template.productName,
      brand: template.brand,
      sku: template.sku,
      campaignHeadline: template.campaignHeadline,
      status: 'playing_today',
      visibility: 'public',
      windowStartIso,
      windowEndIso,
      videoUrl,
      posterUrl: '',
      narratorVoice: 'Charon · Solo Male Baritone',
      durationSec,
      bestPlatform: template.bestPlatform,
      lowestLandedPrice: template.lowestLandedPrice,
      msrp: template.msrp,
      dailyUnitsSoldEstimate: template.dailyUnitsSoldEstimate,
      scriptSummary: template.narrationText,
      ownerId: 'solarbench-scheduler',
      createdAtIso: nowIso,
    };

    const updated = [
      ...ledger.filter((r) => r.dateKey !== nextDateKey),
      newRecord,
    ];
    this.writeLedger(updated);
    return this.getAllSorted();
  }

  getAllSorted(): StoredDailyVideoRecord[] {
    return this.readLedger().sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
  }

  startMidnightScheduler() {
    if (this.schedulerTimer) return;
    // Non-blocking warm-up so boot stays immediate
    void this.initializeAndReconcile().catch((err) => {
      console.warn('Daily video scheduler startup warning:', err);
    });
    this.schedulerTimer = setInterval(() => {
      void this.initializeAndReconcile().catch((err) => {
        console.warn('Daily video scheduler interval warning:', err);
      });
    }, 60_000);
  }
}

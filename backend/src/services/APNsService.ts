import http2 from 'http2';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { DeviceToken } from '../models/DeviceToken';
import { UserPreferences } from '../models/UserPreferences';

interface APNsResponse {
  success: boolean;
  apnsId?: string;
  reason?: string;
  statusCode?: number;
}

export class APNsService {
  private static instance: APNsService;

  private keyId: string;
  private teamId: string;
  private signingKey: Buffer;
  private bundleId: string;
  private host: string;

  private cachedToken: string | null = null;
  private tokenExpiry = 0;

  private session: http2.ClientHttp2Session | null = null;

  private constructor() {
    this.keyId = process.env.APNS_KEY_ID || '';
    this.teamId = process.env.APNS_TEAM_ID || '';
    this.bundleId = process.env.APPLE_BUNDLE_ID || 'fr.divinit.godsplan';

    const env = process.env.APNS_ENVIRONMENT || 'development';
    this.host = env === 'production'
      ? 'https://api.push.apple.com'
      : 'https://api.sandbox.push.apple.com';

    const keyPath = process.env.APNS_KEY_PATH || '';
    if (keyPath && fs.existsSync(keyPath)) {
      this.signingKey = fs.readFileSync(keyPath);
    } else {
      this.signingKey = Buffer.alloc(0);
      console.warn('⚠️  APNs key not found — push notifications disabled');
    }
  }

  static getInstance(): APNsService {
    if (!APNsService.instance) {
      APNsService.instance = new APNsService();
    }
    return APNsService.instance;
  }

  get isConfigured(): boolean {
    return this.signingKey.length > 0 && !!this.keyId && !!this.teamId;
  }

  private getAuthToken(): string {
    const now = Math.floor(Date.now() / 1000);
    // Reuse cached token if less than 50 minutes old
    if (this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    this.cachedToken = jwt.sign({}, this.signingKey, {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: this.keyId,
      },
      issuer: this.teamId,
      expiresIn: '55m',
    });
    this.tokenExpiry = now + 50 * 60;
    return this.cachedToken;
  }

  private getSession(): http2.ClientHttp2Session {
    if (this.session && !this.session.closed && !this.session.destroyed) {
      return this.session;
    }

    this.session = http2.connect(this.host);
    this.session.on('error', (err) => {
      console.error('APNs session error:', err.message);
      this.session = null;
    });
    this.session.on('close', () => {
      this.session = null;
    });

    return this.session;
  }

  async sendNotification(deviceToken: string, title: string, body: string, data?: Record<string, unknown>): Promise<APNsResponse> {
    if (!this.isConfigured) {
      console.warn('APNs not configured, skipping notification');
      return { success: false, reason: 'not_configured' };
    }

    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
      },
      ...data,
    });

    return new Promise((resolve) => {
      const session = this.getSession();
      const req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        'authorization': `bearer ${this.getAuthToken()}`,
        'apns-topic': this.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      });

      let responseData = '';
      let statusCode = 0;
      let apnsId: string | undefined;

      req.on('response', (headers) => {
        statusCode = headers[':status'] as number;
        apnsId = headers['apns-id'] as string | undefined;
      });

      req.on('data', (chunk) => {
        responseData += chunk;
      });

      req.on('end', async () => {
        if (statusCode === 200) {
          resolve({ success: true, apnsId, statusCode });
        } else {
          let reason = 'unknown';
          try {
            reason = JSON.parse(responseData).reason || reason;
          } catch {}

          // 410 Gone = device unregistered the app
          if (statusCode === 410) {
            await this.deactivateToken(deviceToken);
          }

          console.warn(`APNs error for ${deviceToken.slice(0, 8)}...: ${statusCode} ${reason}`);
          resolve({ success: false, reason, statusCode });
        }
      });

      req.on('error', (err) => {
        console.error('APNs request error:', err.message);
        resolve({ success: false, reason: err.message });
      });

      req.end(payload);
    });
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    const tokens = await AppDataSource.getRepository(DeviceToken).find({
      where: { userId, isActive: true },
    });

    for (const dt of tokens) {
      await this.sendNotification(dt.token, title, body, data);
    }
  }

  async sendToSubscribers(churchId: string, title: string, body: string, data?: Record<string, unknown>): Promise<number> {
    // Find users subscribed to this church
    const prefs = await AppDataSource.getRepository(UserPreferences)
      .createQueryBuilder('p')
      .where(`p."subscribedChurches" @> :churchId`, { churchId: JSON.stringify([churchId]) })
      .getMany();

    let sent = 0;
    for (const pref of prefs) {
      const tokens = await AppDataSource.getRepository(DeviceToken).find({
        where: { userId: pref.userId, isActive: true },
      });
      for (const dt of tokens) {
        const result = await this.sendNotification(dt.token, title, body, data);
        if (result.success) sent++;
      }
    }

    return sent;
  }

  private async deactivateToken(token: string): Promise<void> {
    await AppDataSource.getRepository(DeviceToken).update(
      { token },
      { isActive: false },
    );
  }

  destroy(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}

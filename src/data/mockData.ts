import { ArchitectureNode, Finding, PipelineStep, TerminalLog, AffectedFile, ChangeStep, RepositoryInfo } from '../types';

export const sampleRepositories: Record<string, RepositoryInfo> = {
  'facebook/react': {
    url: 'https://github.com/facebook/react',
    owner: 'facebook',
    name: 'react',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    isPublic: true,
    stars: '218k',
    forks: '44.5k',
    lastCommit: '2 hrs ago',
    language: 'JavaScript',
    updatedAgo: '2h ago'
  },
  'vercel/next.js': {
    url: 'https://github.com/vercel/next.js',
    owner: 'vercel',
    name: 'next.js',
    description: 'The React Framework for the Web. Used by top teams to build full-stack web applications.',
    isPublic: true,
    stars: '124k',
    forks: '26.1k',
    lastCommit: '1d ago',
    language: 'TypeScript',
    updatedAgo: '1d ago'
  },
  'tailwindlabs/tailwindcss': {
    url: 'https://github.com/tailwindlabs/tailwindcss',
    owner: 'tailwindlabs',
    name: 'tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development.',
    isPublic: true,
    stars: '82.4k',
    forks: '4.2k',
    lastCommit: '3d ago',
    language: 'JavaScript',
    updatedAgo: '3d ago'
  },
  'aqua-lens-web': {
    url: 'https://github.com/aqualens/aqua-lens-web',
    owner: 'aqualens',
    name: 'aqua-lens-web',
    description: 'Aqua Lens frontend orchestration and interactive visualization engine.',
    isPublic: true,
    stars: '1.2k',
    forks: '180',
    lastCommit: '10 mins ago',
    language: 'TypeScript',
    updatedAgo: 'Just now'
  }
};

export const architectureNodes: ArchitectureNode[] = [
  {
    id: 'web_app',
    label: 'Web_App',
    type: 'client',
    x: 150,
    y: 210,
    status: 'healthy',
    version: 'v2.4.1',
    latency: '12ms',
    outgoingCount: 1,
    requestVolume: [20, 40, 30, 50, 70, 45, 90, 60, 85, 35],
    filePath: 'src/App.tsx'
  },
  {
    id: 'gateway',
    label: 'Gateway',
    type: 'gateway',
    x: 450,
    y: 210,
    status: 'healthy',
    version: 'v1.8.0',
    latency: '45ms',
    outgoingCount: 2,
    requestVolume: [35, 55, 60, 80, 95, 70, 110, 85, 100, 65],
    filePath: 'api/gateway.ts'
  },
  {
    id: 'auth_svc',
    label: 'Auth_Svc',
    type: 'service',
    x: 750,
    y: 110,
    status: 'warning',
    version: 'v3.1.2',
    latency: '82ms',
    outgoingCount: 1,
    requestVolume: [10, 25, 40, 30, 60, 80, 75, 90, 50, 40],
    filePath: 'src/services/auth.service.ts'
  },
  {
    id: 'core_svc',
    label: 'Core_Svc',
    type: 'service',
    x: 750,
    y: 310,
    status: 'healthy',
    version: 'v4.0.0',
    latency: '28ms',
    outgoingCount: 1,
    requestVolume: [50, 60, 55, 75, 85, 90, 95, 80, 70, 65],
    filePath: 'src/services/core.service.ts'
  },
  {
    id: 'user_db',
    label: 'User_DB',
    type: 'database',
    x: 1050,
    y: 210,
    status: 'healthy',
    version: 'PostgreSQL 15',
    latency: '4ms',
    outgoingCount: 0,
    requestVolume: [80, 90, 85, 100, 110, 105, 120, 115, 95, 88],
    filePath: 'db/schema.sql'
  }
];

export const codebaseFindings: Finding[] = [
  {
    id: 'f1',
    severity: 'critical',
    category: 'Architecture',
    title: 'Circular dependency detected',
    description: 'Modules in /services/auth and /services/user reference each other recursively.',
    affectedPath: '/services/auth & /services/user',
    isNew: true
  },
  {
    id: 'f2',
    severity: 'warning',
    category: 'API',
    title: 'Unused API endpoints',
    description: '3 endpoints in /v1/legacy have no discovered inbound references or consumer calls.',
    affectedPath: '/v1/legacy',
    isNew: true
  },
  {
    id: 'f3',
    severity: 'info',
    category: 'Performance',
    title: 'Large bundle size',
    description: 'The main chunk exceeds 500kb. Consider code splitting DataGrid component.',
    affectedPath: 'src/components/DataGrid.tsx',
    isNew: true
  },
  {
    id: 'f4',
    severity: 'info',
    category: 'Security',
    title: 'Outdated dependency',
    description: 'Package lodash is 2 major versions behind. Minor security advisories exist.',
    affectedPath: 'package.json',
    isNew: false
  }
];

export const pipelineSteps: PipelineStep[] = [
  {
    id: 1,
    title: 'Cloning repository',
    detail: 'Completed in 1.2s',
    status: 'completed',
    timeOrCount: '1.2s'
  },
  {
    id: 2,
    title: 'Detecting languages/frameworks',
    detail: 'Found TS, React, Node.js',
    status: 'completed',
    timeOrCount: 'Found TS, React, Node.js'
  },
  {
    id: 3,
    title: 'Indexing files',
    detail: 'src/lib/utils/formatters.ts',
    status: 'active',
    progressPercent: 68,
    timeOrCount: '1,204 / 1,780 files'
  },
  {
    id: 4,
    title: 'Extracting symbols',
    detail: 'Pending',
    status: 'pending'
  },
  {
    id: 5,
    title: 'Mapping dependencies',
    detail: 'Pending',
    status: 'pending'
  },
  {
    id: 6,
    title: 'Tracing architecture',
    detail: 'Pending',
    status: 'pending'
  }
];

export const initialLogs: TerminalLog[] = [
  { id: '1', time: '00:00.1', prefix: 'SYS>', message: 'Initializing Aqua Lens analysis engine...' },
  { id: '2', time: '00:01.2', prefix: 'SYS>', message: 'Cloning repository from origin... DONE' },
  { id: '3', time: '00:02.4', prefix: 'AST>', message: 'Detected Framework: Next.js v13+ / React 18', type: 'highlight' },
  { id: '4', time: '00:03.1', prefix: 'AST>', message: 'Language breakdown: TS (84%), CSS (10%), JS (6%)' },
  { id: '5', time: '00:04.5', prefix: 'IDX>', message: 'Starting file indexer (1,780 items)...' },
  { id: '6', time: '00:05.8', prefix: 'IDX>', message: 'Found 14 TypeScript definition files (*.d.ts)' },
  { id: '7', time: '00:07.2', prefix: 'IDX>', message: 'Identified 45 React component files' },
  { id: '8', time: '00:09.1', prefix: 'IDX>', message: 'Warning: Circular dependency detected in /utils/auth.ts', type: 'warning' },
  { id: '9', time: '00:11.4', prefix: 'IDX>', message: 'Indexing controllers... (32/40)' },
  { id: '10', time: '00:12.7', prefix: 'IDX>', message: 'Extracting API routes... found 12 endpoints', type: 'highlight' }
];

export const affectedFilesList: AffectedFile[] = [
  { id: 'a1', path: 'AuthController.ts', level: 1, isCritical: true, icon: 'save_as' },
  { id: 'a2', path: 'SessionManager.ts', level: 1, isCritical: true, icon: 'save_as' },
  { id: 'a3', path: 'ProfileView.tsx', level: 1, isCritical: true, icon: 'javascript' },
  { id: 'a4', path: 'api/routes.ts', level: 2, isCritical: false, icon: 'save_as' },
  { id: 'a5', path: 'utils/logger.ts', level: 3, isCritical: false, icon: 'save_as' },
  { id: 'a6', path: 'package.json', level: 4, isCritical: false, icon: 'description' },
  { id: 'a7', path: 'tests/user.test.ts', level: 2, isCritical: false, icon: 'fact_check' },
  { id: 'a8', path: 'config/permissions.ts', level: 3, isCritical: false, icon: 'lock' }
];

export const changePlanSteps: ChangeStep[] = [
  {
    id: 'step-1',
    stepNumber: '01',
    type: 'Modify',
    filePath: 'src/config/auth.config.ts',
    diffHeader: '@@ -14,5 +14,9 @@',
    diffLines: [
      { numBefore: 14, numAfter: 14, type: 'same', content: '  providers: [' },
      { numBefore: 15, numAfter: 15, type: 'same', content: '    new GithubProvider(process.env.GITHUB_CLIENT_ID),' },
      { numAfter: 16, type: 'add', content: '    new GoogleProvider({' },
      { numAfter: 17, type: 'add', content: '      clientId: process.env.GOOGLE_CLIENT_ID,' },
      { numAfter: 18, type: 'add', content: '      clientSecret: process.env.GOOGLE_CLIENT_SECRET' },
      { numAfter: 19, type: 'add', content: '    }),' },
      { numBefore: 16, numAfter: 20, type: 'same', content: '  ],' }
    ]
  },
  {
    id: 'step-2',
    stepNumber: '02',
    type: 'Create',
    filePath: 'src/providers/google-auth.provider.ts',
    linesCount: 74,
    badgeText: '74 lines'
  },
  {
    id: 'step-3',
    stepNumber: '03',
    type: 'Update',
    filePath: 'src/services/user.service.ts',
    description: 'Handle new provider IDs'
  },
  {
    id: 'step-4',
    stepNumber: '04',
    type: 'Migration',
    filePath: 'db/migrations/20231024_add_google_id.sql',
    badgeText: 'Schema Change',
    isWarning: true
  }
];

export const sampleCodeAuthService = `import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(user: User) {
    const payload = { 
      sub: user.id, 
      email: user.email,
      roles: user.roles 
    };

    // Generate signed JWT for the authenticated user
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '1h'
      }),
    };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    // Validate credentials against user repository
    return null;
  }
}`;

export const sampleCodePaymentProcessor = `import { Stripe } from 'stripe';
import { Logger } from '../utils/logger';
import { db } from '../db';

export class PaymentProcessor {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_KEY);
  }

  async processPayment(amount: number, userId: string) {
    try {
      const user = await db.users.findById(userId);
      if (!user) throw new Error('User not found');
      
      /* Legacy handling - to be deprecated */
      const intent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'usd'
      });
      return intent;
    } catch (e) {
      Logger.error(e);
    }
  }
}`;

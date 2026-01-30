const MERCURY_API_BASE = 'https://api.mercury.com/api/v1';

interface MercuryRecipient {
  id: string;
  name: string;
  emails: string[];
  electronicRoutingInfo?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    electronicAccountType: 'businessChecking' | 'businessSavings' | 'personalChecking' | 'personalSavings';
  };
  domesticWireRoutingInfo?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    address: {
      address1: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    };
  };
  status: 'active' | 'deleted';
  dateLastPaid: string | null;
  paymentMethod: 'ach' | 'domesticWire' | 'internationalWire' | 'check';
}

interface MercuryAccount {
  id: string;
  name: string;
  nickname: string;
  status: 'active' | 'pending' | 'deleted';
  type: 'checking' | 'savings' | 'mercury-credit';
  kind: 'mercury' | 'external';
  routingNumber: string;
  accountNumber: string;
  availableBalance: number;
  currentBalance: number;
}

interface MercuryPaymentRequest {
  accountId: string;
  requestId: string;
  recipientId: string;
  memo: string | null;
  paymentMethod: string;
  amount: number;
  status: 'pendingApproval' | 'approved' | 'rejected' | 'cancelled';
}

interface MercuryTransaction {
  id: string;
  amount: number;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  counterpartyName: string;
  createdAt: string;
}

class MercuryClient {
  private token: string;
  private accountId: string;

  constructor() {
    const token = process.env.MERCURY_API_TOKEN;
    const accountId = process.env.MERCURY_ACCOUNT_ID;
    
    if (!token) {
      throw new Error('MERCURY_API_TOKEN environment variable is not set');
    }
    if (!accountId) {
      throw new Error('MERCURY_ACCOUNT_ID environment variable is not set');
    }
    
    this.token = token;
    this.accountId = accountId;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${MERCURY_API_BASE}${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[Mercury] ${method} ${endpoint}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Mercury] Error ${response.status}: ${errorText}`);
      throw new Error(`Mercury API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getAccounts(): Promise<{ accounts: MercuryAccount[] }> {
    return this.request<{ accounts: MercuryAccount[] }>('GET', '/accounts');
  }

  async getAccount(accountId?: string): Promise<MercuryAccount> {
    const id = accountId || this.accountId;
    return this.request<MercuryAccount>('GET', `/account/${id}`);
  }

  async getRecipients(): Promise<{ recipients: MercuryRecipient[] }> {
    return this.request<{ recipients: MercuryRecipient[] }>('GET', '/recipients');
  }

  async findRecipientByBankAccount(routingNumber: string, accountNumber: string): Promise<MercuryRecipient | null> {
    const { recipients } = await this.getRecipients();
    
    const lastFourAccount = accountNumber.slice(-4);
    
    for (const recipient of recipients) {
      if (recipient.status !== 'active') continue;
      
      if (recipient.electronicRoutingInfo) {
        const recipientLastFour = recipient.electronicRoutingInfo.accountNumber.slice(-4);
        if (
          recipient.electronicRoutingInfo.routingNumber === routingNumber &&
          recipientLastFour === lastFourAccount
        ) {
          return recipient;
        }
      }
    }
    
    return null;
  }

  async requestSendMoney(params: {
    recipientId: string;
    amount: number;
    paymentMethod?: 'ach' | 'domesticWire';
    memo?: string;
    idempotencyKey: string;
  }): Promise<MercuryPaymentRequest> {
    return this.request<MercuryPaymentRequest>(
      'POST',
      `/account/${this.accountId}/request-send-money`,
      {
        recipientId: params.recipientId,
        amount: params.amount,
        paymentMethod: params.paymentMethod || 'ach',
        memo: params.memo || '',
        idempotencyKey: params.idempotencyKey,
      }
    );
  }

  async getAccountBalance(): Promise<{ available: number; current: number }> {
    const account = await this.getAccount();
    return {
      available: account.availableBalance,
      current: account.currentBalance,
    };
  }
}

let mercuryClientInstance: MercuryClient | null = null;

export function getMercuryClient(): MercuryClient {
  if (!mercuryClientInstance) {
    mercuryClientInstance = new MercuryClient();
  }
  return mercuryClientInstance;
}

export function hasMercuryCredentials(): boolean {
  return !!(process.env.MERCURY_API_TOKEN && process.env.MERCURY_ACCOUNT_ID);
}

export type { MercuryRecipient, MercuryAccount, MercuryPaymentRequest, MercuryTransaction };

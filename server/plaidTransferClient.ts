import { PlaidApi, Configuration, PlaidEnvironments, TransferType, TransferNetwork, ACHClass } from 'plaid';

let plaidClientInstance: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (plaidClientInstance) return plaidClientInstance;

  const plaidClientId = process.env.PLAID_CLIENT_ID;
  const plaidSecret = process.env.PLAID_SECRET;

  if (!plaidClientId || !plaidSecret) {
    throw new Error('Plaid credentials not configured');
  }

  const plaidEnvName = process.env.PLAID_ENV || 'production';
  const plaidEnv = plaidEnvName === 'sandbox' ? PlaidEnvironments.sandbox :
                   plaidEnvName === 'development' ? PlaidEnvironments.development :
                   PlaidEnvironments.production;

  const configuration = new Configuration({
    basePath: plaidEnv,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret,
      },
    },
  });

  plaidClientInstance = new PlaidApi(configuration);
  return plaidClientInstance;
}

export function hasPlaidCredentials(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export type TransferSpeed = 'standard' | 'same-day' | 'instant';

interface PlaidTransferResult {
  transferId: string;
  status: string;
  network: string;
  arrivalTime: string;
}

export async function createPlaidPayout(params: {
  accessToken: string;
  accountId: string;
  amount: number;
  userName: string;
  description?: string;
  speed?: TransferSpeed;
  idempotencyKey?: string;
}): Promise<PlaidTransferResult> {
  const plaid = getPlaidClient();
  
  let network: TransferNetwork;
  let arrivalTime: string;
  
  switch (params.speed) {
    case 'instant':
      network = TransferNetwork.Rtp;
      arrivalTime = 'Within minutes';
      break;
    case 'same-day':
      network = TransferNetwork.SameDayAch;
      arrivalTime = 'Same business day';
      break;
    default:
      network = TransferNetwork.Ach;
      arrivalTime = '1-3 business days';
  }

  console.log(`[Plaid Transfer] Authorizing $${params.amount} payout via ${network}`);

  const authResponse = await plaid.transferAuthorizationCreate({
    access_token: params.accessToken,
    account_id: params.accountId,
    type: TransferType.Credit,
    network: network,
    amount: params.amount.toFixed(2),
    ach_class: ACHClass.Ppd,
    user: {
      legal_name: params.userName,
    },
    idempotency_key: params.idempotencyKey ? `auth-${params.idempotencyKey}` : undefined,
  });

  const authorization = authResponse.data.authorization;
  
  if (authorization.decision === 'declined') {
    const reason = authorization.decision_rationale?.description || 'Transfer declined';
    console.error(`[Plaid Transfer] Authorization declined: ${reason}`);
    throw new Error(`Payout declined: ${reason}`);
  }

  if (authorization.decision === 'user_action_required') {
    console.error('[Plaid Transfer] User action required - bank reconnection needed');
    throw new Error('Bank account connection needs to be refreshed. Please re-link your bank account.');
  }

  console.log(`[Plaid Transfer] Authorization approved: ${authorization.id}`);

  const transferResponse = await plaid.transferCreate({
    access_token: params.accessToken,
    account_id: params.accountId,
    authorization_id: authorization.id,
    description: params.description || 'ChipIn Wallet Withdrawal',
    idempotency_key: params.idempotencyKey,
  });

  const transfer = transferResponse.data.transfer;
  
  console.log(`[Plaid Transfer] Transfer created: ${transfer.id}, status: ${transfer.status}`);

  return {
    transferId: transfer.id,
    status: transfer.status,
    network: transfer.network,
    arrivalTime,
  };
}

export async function getPlaidTransferStatus(transferId: string): Promise<{
  id: string;
  status: string;
  amount: string;
  network: string;
  created: string;
}> {
  const plaid = getPlaidClient();
  
  const response = await plaid.transferGet({ transfer_id: transferId });
  const transfer = response.data.transfer;
  
  return {
    id: transfer.id,
    status: transfer.status,
    amount: transfer.amount,
    network: transfer.network,
    created: transfer.created,
  };
}
